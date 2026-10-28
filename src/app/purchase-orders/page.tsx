import { db, listProducts } from "@/lib/db";
import { createPurchaseOrder, receivePurchaseOrder } from "@/lib/actions";
import { money, when } from "@/lib/format";
import ErrorBanner from "@/components/ErrorBanner";
import LineInputs from "@/components/LineInputs";

export const dynamic = "force-dynamic";

type PO = { id: number; supplier: string; status: string; created_at: string; total: number; items: string };

export default async function PurchaseOrders({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  const products = listProducts();
  const suppliers = db.prepare("SELECT id, name FROM parties WHERE type='supplier' ORDER BY name").all() as { id: number; name: string }[];

  const orders = db
    .prepare(
      `SELECT po.id, s.name AS supplier, po.status, po.created_at,
              COALESCE(SUM(i.qty * i.unit_cost), 0) AS total,
              COALESCE(GROUP_CONCAT(p.sku || ' x' || i.qty, ', '), '') AS items
       FROM purchase_orders po
       JOIN parties s ON s.id = po.supplier_id
       LEFT JOIN purchase_order_items i ON i.po_id = po.id
       LEFT JOIN products p ON p.id = i.product_id
       GROUP BY po.id ORDER BY po.id DESC`
    )
    .all() as PO[];

  return (
    <>
      <h2>Purchase orders</h2>
      <p className="sub">Receiving a purchase order adds stock to the ledger.</p>
      <ErrorBanner message={error} />

      <div className="tablewrap">
        {orders.length === 0 ? (
          <div className="empty">No purchase orders yet.</div>
        ) : (
          <table>
            <thead><tr><th>PO</th><th>Supplier</th><th>Items</th><th className="num">Total</th><th>Created</th><th>Status</th><th></th></tr></thead>
            <tbody>
              {orders.map((o) => (
                <tr key={o.id}>
                  <td>PO-{o.id}</td>
                  <td>{o.supplier}</td>
                  <td>{o.items}</td>
                  <td className="num">{money(o.total)}</td>
                  <td>{when(o.created_at)}</td>
                  <td>{o.status === "RECEIVED" ? <span className="badge ok">Received</span> : <span className="badge warn">Draft</span>}</td>
                  <td>
                    {o.status === "DRAFT" && (
                      <form action={receivePurchaseOrder}>
                        <input type="hidden" name="id" value={o.id} />
                        <button className="small" type="submit">Receive goods</button>
                      </form>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <h3>New purchase order</h3>
      <form className="panel" action={createPurchaseOrder}>
        <div style={{ maxWidth: 320 }}>
          <label>Supplier</label>
          <select name="supplier_id" defaultValue="" required>
            <option value="" disabled>Choose supplier</option>
            {suppliers.map((s) => (<option key={s.id} value={s.id}>{s.name}</option>))}
          </select>
        </div>
        <LineInputs products={products} moneyKey="cost" moneyLabel="Unit cost" />
        <p><button type="submit">Create purchase order</button></p>
      </form>
    </>
  );
}
