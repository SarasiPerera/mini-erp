"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db, getStock } from "./db";

const LINES = 4;

function fail(path: string, message: string): never {
  redirect(`${path}?error=${encodeURIComponent(message)}`);
}

function num(v: FormDataEntryValue | null, fallback = NaN): number {
  if (v === null || String(v).trim() === "") return fallback;
  return Number(v);
}

function str(v: FormDataEntryValue | null): string {
  return String(v ?? "").trim();
}

type Line = { productId: number; qty: number; money: number };

function readLines(form: FormData, moneyKey: string): Line[] {
  const lines: Line[] = [];
  for (let i = 1; i <= LINES; i++) {
    const productId = num(form.get(`product_${i}`), 0);
    const qty = num(form.get(`qty_${i}`), 0);
    if (!productId || !qty) continue;
    lines.push({ productId, qty, money: num(form.get(`${moneyKey}_${i}`), NaN) });
  }
  return lines;
}

/* ----------------------------- Products ----------------------------- */

export async function createProduct(form: FormData) {
  const sku = str(form.get("sku")).toUpperCase();
  const name = str(form.get("name"));
  const cost = num(form.get("cost"), 0);
  const price = num(form.get("price"), 0);
  const reorder = num(form.get("reorder_level"), 5);
  const opening = num(form.get("opening_stock"), 0);

  if (!sku || !name) fail("/products", "SKU and name are required.");
  if ([cost, price, reorder, opening].some((n) => Number.isNaN(n) || n < 0))
    fail("/products", "Numbers must be zero or greater.");

  const exists = db.prepare("SELECT 1 FROM products WHERE sku = ?").get(sku);
  if (exists) fail("/products", `SKU ${sku} already exists.`);

  db.transaction(() => {
    const id = Number(
      db
        .prepare("INSERT INTO products (sku, name, cost, price, reorder_level) VALUES (?, ?, ?, ?, ?)")
        .run(sku, name, cost, price, Math.floor(reorder)).lastInsertRowid
    );
    if (opening > 0) {
      db.prepare(
        "INSERT INTO stock_movements (product_id, change, reason, ref) VALUES (?, ?, 'OPENING', 'Opening stock')"
      ).run(id, Math.floor(opening));
    }
  })();

  revalidatePath("/", "layout");
  redirect("/products");
}

/* ------------------------ Suppliers / Customers ------------------------ */

export async function createParty(form: FormData) {
  const type = str(form.get("type"));
  const name = str(form.get("name"));
  const path = type === "supplier" ? "/suppliers" : "/customers";
  if (type !== "supplier" && type !== "customer") fail("/", "Invalid party type.");
  if (!name) fail(path, "Name is required.");

  db.prepare("INSERT INTO parties (type, name, email, phone) VALUES (?, ?, ?, ?)").run(
    type,
    name,
    str(form.get("email")) || null,
    str(form.get("phone")) || null
  );
  revalidatePath("/", "layout");
  redirect(path);
}

/* --------------------------- Purchase orders --------------------------- */

export async function createPurchaseOrder(form: FormData) {
  const supplierId = num(form.get("supplier_id"), 0);
  if (!supplierId) fail("/purchase-orders", "Choose a supplier.");

  const lines = readLines(form, "cost");
  if (lines.length === 0) fail("/purchase-orders", "Add at least one line with a product and quantity.");
  if (lines.some((l) => l.qty <= 0 || !Number.isInteger(l.qty)))
    fail("/purchase-orders", "Quantities must be whole numbers above zero.");

  db.transaction(() => {
    const poId = Number(
      db.prepare("INSERT INTO purchase_orders (supplier_id) VALUES (?)").run(supplierId).lastInsertRowid
    );
    const getCost = db.prepare("SELECT cost FROM products WHERE id = ?");
    const insert = db.prepare(
      "INSERT INTO purchase_order_items (po_id, product_id, qty, unit_cost) VALUES (?, ?, ?, ?)"
    );
    for (const l of lines) {
      const cost = Number.isNaN(l.money) ? (getCost.get(l.productId) as { cost: number }).cost : l.money;
      insert.run(poId, l.productId, l.qty, cost);
    }
  })();

  revalidatePath("/", "layout");
  redirect("/purchase-orders");
}

export async function receivePurchaseOrder(form: FormData) {
  const id = num(form.get("id"), 0);
  const po = db.prepare("SELECT id, status FROM purchase_orders WHERE id = ?").get(id) as
    | { id: number; status: string }
    | undefined;
  if (!po) fail("/purchase-orders", "Purchase order not found.");
  if (po.status !== "DRAFT") fail("/purchase-orders", `PO-${id} was already received.`);

  db.transaction(() => {
    const items = db
      .prepare("SELECT product_id, qty FROM purchase_order_items WHERE po_id = ?")
      .all(id) as { product_id: number; qty: number }[];
    const move = db.prepare(
      "INSERT INTO stock_movements (product_id, change, reason, ref) VALUES (?, ?, 'PURCHASE', ?)"
    );
    for (const it of items) move.run(it.product_id, it.qty, `PO-${id}`);
    db.prepare("UPDATE purchase_orders SET status = 'RECEIVED', received_at = datetime('now') WHERE id = ?").run(id);
  })();

  revalidatePath("/", "layout");
  redirect("/purchase-orders");
}

/* ----------------------------- Sales orders ----------------------------- */

export async function createSalesOrder(form: FormData) {
  const customerId = num(form.get("customer_id"), 0);
  if (!customerId) fail("/sales-orders", "Choose a customer.");

  const lines = readLines(form, "price");
  if (lines.length === 0) fail("/sales-orders", "Add at least one line with a product and quantity.");
  if (lines.some((l) => l.qty <= 0 || !Number.isInteger(l.qty)))
    fail("/sales-orders", "Quantities must be whole numbers above zero.");

  db.transaction(() => {
    const soId = Number(
      db.prepare("INSERT INTO sales_orders (customer_id) VALUES (?)").run(customerId).lastInsertRowid
    );
    const getPrice = db.prepare("SELECT price FROM products WHERE id = ?");
    const insert = db.prepare(
      "INSERT INTO sales_order_items (so_id, product_id, qty, unit_price) VALUES (?, ?, ?, ?)"
    );
    for (const l of lines) {
      const price = Number.isNaN(l.money) ? (getPrice.get(l.productId) as { price: number }).price : l.money;
      insert.run(soId, l.productId, l.qty, price);
    }
  })();

  revalidatePath("/", "layout");
  redirect("/sales-orders");
}

export async function confirmSalesOrder(form: FormData) {
  const id = num(form.get("id"), 0);
  const so = db.prepare("SELECT id, status FROM sales_orders WHERE id = ?").get(id) as
    | { id: number; status: string }
    | undefined;
  if (!so) fail("/sales-orders", "Sales order not found.");
  if (so.status !== "DRAFT") fail("/sales-orders", `SO-${id} is already ${so.status.toLowerCase()}.`);

  let problem: string | null = null;

  // One transaction: check stock for every line, then write the ledger rows.
  db.transaction(() => {
    const items = db
      .prepare(
        `SELECT i.product_id, i.qty, p.name FROM sales_order_items i
         JOIN products p ON p.id = i.product_id WHERE i.so_id = ?`
      )
      .all(id) as { product_id: number; qty: number; name: string }[];

    const needed = new Map<number, { qty: number; name: string }>();
    for (const it of items) {
      const cur = needed.get(it.product_id);
      needed.set(it.product_id, { qty: (cur?.qty ?? 0) + it.qty, name: it.name });
    }
    for (const [productId, { qty, name }] of needed) {
      const available = getStock(productId);
      if (qty > available) {
        problem = `Not enough stock for ${name}: need ${qty}, have ${available}.`;
        return;
      }
    }

    const move = db.prepare(
      "INSERT INTO stock_movements (product_id, change, reason, ref) VALUES (?, ?, 'SALE', ?)"
    );
    for (const it of items) move.run(it.product_id, -it.qty, `SO-${id}`);
    db.prepare("UPDATE sales_orders SET status = 'CONFIRMED', confirmed_at = datetime('now') WHERE id = ?").run(id);
  })();

  if (problem) fail("/sales-orders", problem);
  revalidatePath("/", "layout");
  redirect("/sales-orders");
}

export async function cancelSalesOrder(form: FormData) {
  const id = num(form.get("id"), 0);
  db.prepare("UPDATE sales_orders SET status = 'CANCELLED' WHERE id = ? AND status = 'DRAFT'").run(id);
  revalidatePath("/", "layout");
  redirect("/sales-orders");
}
