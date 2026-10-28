import Database from "better-sqlite3";
import path from "node:path";
import fs from "node:fs";

const DB_PATH = path.join(process.cwd(), "data", "erp.db");

const SCHEMA = `
CREATE TABLE IF NOT EXISTS products (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  sku           TEXT NOT NULL UNIQUE,
  name          TEXT NOT NULL,
  cost          REAL NOT NULL DEFAULT 0,
  price         REAL NOT NULL DEFAULT 0,
  reorder_level INTEGER NOT NULL DEFAULT 5
);

CREATE TABLE IF NOT EXISTS parties (
  id    INTEGER PRIMARY KEY AUTOINCREMENT,
  type  TEXT NOT NULL CHECK (type IN ('supplier','customer')),
  name  TEXT NOT NULL,
  email TEXT,
  phone TEXT
);

CREATE TABLE IF NOT EXISTS purchase_orders (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  supplier_id INTEGER NOT NULL REFERENCES parties(id),
  status      TEXT NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT','RECEIVED')),
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  received_at TEXT
);

CREATE TABLE IF NOT EXISTS purchase_order_items (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  po_id      INTEGER NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
  product_id INTEGER NOT NULL REFERENCES products(id),
  qty        INTEGER NOT NULL CHECK (qty > 0),
  unit_cost  REAL NOT NULL
);

CREATE TABLE IF NOT EXISTS sales_orders (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  customer_id INTEGER NOT NULL REFERENCES parties(id),
  status      TEXT NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT','CONFIRMED','CANCELLED')),
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  confirmed_at TEXT
);

CREATE TABLE IF NOT EXISTS sales_order_items (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  so_id      INTEGER NOT NULL REFERENCES sales_orders(id) ON DELETE CASCADE,
  product_id INTEGER NOT NULL REFERENCES products(id),
  qty        INTEGER NOT NULL CHECK (qty > 0),
  unit_price REAL NOT NULL
);

-- The ledger. Stock is never edited directly: it is the SUM of these rows.
CREATE TABLE IF NOT EXISTS stock_movements (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  product_id INTEGER NOT NULL REFERENCES products(id),
  change     INTEGER NOT NULL,
  reason     TEXT NOT NULL,
  ref        TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_movements_product ON stock_movements(product_id);
`;

export const STOCK_SQL = `COALESCE((SELECT SUM(change) FROM stock_movements m WHERE m.product_id = p.id), 0)`;

export function seed(db: Database.Database) {
  const tx = db.transaction(() => {
    const addProduct = db.prepare(
      "INSERT INTO products (sku, name, cost, price, reorder_level) VALUES (?, ?, ?, ?, ?)"
    );
    const addMove = db.prepare(
      "INSERT INTO stock_movements (product_id, change, reason, ref) VALUES (?, ?, 'OPENING', 'Opening stock')"
    );
    const products: [string, string, number, number, number, number][] = [
      ["RICE-5KG", "Samba Rice 5kg", 1400, 1750, 10, 40],
      ["TEA-400G", "Ceylon Tea 400g", 780, 990, 8, 6],
      ["COCO-OIL", "Coconut Oil 1L", 920, 1150, 10, 25],
      ["SUGAR-1KG", "White Sugar 1kg", 260, 330, 20, 4],
      ["SOAP-BAR", "Herbal Soap Bar", 95, 140, 15, 60],
    ];
    for (const [sku, name, cost, price, reorder, opening] of products) {
      const id = Number(addProduct.run(sku, name, cost, price, reorder).lastInsertRowid);
      addMove.run(id, opening);
    }
    const addParty = db.prepare("INSERT INTO parties (type, name, email, phone) VALUES (?, ?, ?, ?)");
    addParty.run("supplier", "Lanka Wholesale Traders", "sales@lankawholesale.example", "011 234 5678");
    addParty.run("supplier", "Green Valley Farms", "orders@greenvalley.example", "081 222 3344");
    addParty.run("customer", "Perera Stores", "perera@example.com", "077 123 4567");
    addParty.run("customer", "City Mini Mart", "citymart@example.com", "071 987 6543");
  });
  tx();
}

function open(): Database.Database {
  fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
  const db = new Database(DB_PATH);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  db.exec(SCHEMA);
  const count = (db.prepare("SELECT COUNT(*) AS c FROM products").get() as { c: number }).c;
  if (count === 0) seed(db);
  return db;
}

const g = globalThis as unknown as { __erpDb?: Database.Database };
export const db: Database.Database = g.__erpDb ?? (g.__erpDb = open());

export type Product = {
  id: number;
  sku: string;
  name: string;
  cost: number;
  price: number;
  reorder_level: number;
  stock: number;
};

export function listProducts(): Product[] {
  return db
    .prepare(`SELECT p.*, ${STOCK_SQL} AS stock FROM products p ORDER BY p.name`)
    .all() as Product[];
}

export function getStock(productId: number): number {
  const row = db
    .prepare(`SELECT ${STOCK_SQL} AS stock FROM products p WHERE p.id = ?`)
    .get(productId) as { stock: number } | undefined;
  return row?.stock ?? 0;
}
