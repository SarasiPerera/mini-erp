import { db, listProducts } from "@/lib/db";
import { createSalesOrder, confirmSalesOrder, cancelSalesOrder } from "@/lib/actions";
import { money, when } from "@/lib/format";
import ErrorBanner from "@/components/ErrorBanner";
import LineInputs from "@/components/LineInputs";

export const dynamic = "force-dynamic";

type SO = { id: number; customer: string; status: string; created_at: string; total: number; items: string };

export default async function SalesOrders({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  const products = listProducts();
  const customers = db.prepare("SELECT id, name FROM parties WHERE type='customer' ORDER BY name").all() as { id: number; name: string }[];

  const orders = db
    .prepare(
      `SELECT so.id, c.name AS customer, so.status, so.created_at,
              COALESCE(SUM(i.qty * i.unit_price), 0) AS total,
              COALESCE(GROUP_CONCAT(p.sku || ' x' || i.qty, ', '), '') AS items
       FROM sales_orders so
       JOIN parties c ON c.id = so.customer_id
       LEFT JOIN sales_order_items i ON i.so_id = so.id
       LEFT JOIN products p ON p.id = i.product_id
       GROUP BY so.id ORDER BY so.id DESC`
    )
    .all() as SO[];

  const badge = (s: string) =>
    s === "CONFIRMED" ? <span className="badge ok">Confirmed</span>
    : s === "CANCELLED" ? <span className="badge bad">Cancelled</span>
    : <span className="badge warn">Draft</span>;

  return (
    <>
      <h2>Sales orders</h2>
      <p className="sub">Confirming a sales order removes stock. Overselling is blocked.</p>
      <ErrorBanner message={error} />

      <div className="tablewrap">
        {orders.length === 0 ? (
          <div className="empty">No sales orders yet.</div>
        ) : (
          <table>
            <thead><tr><th>SO</th><th>Customer</th><th>Items</th><th className="num">Total</th><th>Created</th><th>Status</th><th></th></tr></thead>
            <tbody>
              {orders.map((o) => (
                <tr key={o.id}>
                  <td>SO-{o.id}</td>
                  <td>{o.customer}</td>
                  <td>{o.items}</td>
                  <td className="num">{money(o.total)}</td>
                  <td>{when(o.created_at)}</td>
                  <td>{badge(o.status)}</td>
                  <td>
                    {o.status === "DRAFT" && (
                      <div className="row-actions">
                        <form action={confirmSalesOrder}>
                          <input type="hidden" name="id" value={o.id} />
                          <button className="small" type="submit">Confirm</button>
                        </form>
                        <form action={cancelSalesOrder}>
                          <input type="hidden" name="id" value={o.id} />
                          <button className="small ghost" type="submit">Cancel</button>
                        </form>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <h3>New sales order</h3>
      <form className="panel" action={createSalesOrder}>
        <div style={{ maxWidth: 320 }}>
          <label>Customer</label>
          <select name="customer_id" defaultValue="" required>
            <option value="" disabled>Choose customer</option>
            {customers.map((c) => (<option key={c.id} value={c.id}>{c.name}</option>))}
          </select>
        </div>
        <LineInputs products={products} moneyKey="price" moneyLabel="Unit price" />
        <p><button type="submit">Create sales order</button></p>
      </form>
    </>
  );
}
