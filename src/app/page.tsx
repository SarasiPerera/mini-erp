import { db, listProducts } from "@/lib/db";
import { money } from "@/lib/format";

export const dynamic = "force-dynamic";

export default function Dashboard() {
  const products = listProducts();
  const low = products.filter((p) => p.stock <= p.reorder_level);
  const stockValue = products.reduce((s, p) => s + p.stock * p.cost, 0);

  const openPOs = (db.prepare("SELECT COUNT(*) c FROM purchase_orders WHERE status='DRAFT'").get() as { c: number }).c;
  const openSOs = (db.prepare("SELECT COUNT(*) c FROM sales_orders WHERE status='DRAFT'").get() as { c: number }).c;
  const revenue = (
    db
      .prepare(
        `SELECT COALESCE(SUM(i.qty * i.unit_price), 0) r FROM sales_order_items i
         JOIN sales_orders s ON s.id = i.so_id WHERE s.status = 'CONFIRMED'`
      )
      .get() as { r: number }
  ).r;

  return (
    <>
      <h2>Dashboard</h2>
      <p className="sub">A quick view of stock, orders and revenue.</p>

      <div className="cards">
        <div className="card"><div className="k">Products</div><div className="v">{products.length}</div></div>
        <div className="card"><div className="k">Stock value (at cost)</div><div className="v">{money(stockValue)}</div></div>
        <div className="card"><div className="k">Low-stock items</div><div className="v">{low.length}</div></div>
        <div className="card"><div className="k">Open purchase orders</div><div className="v">{openPOs}</div></div>
        <div className="card"><div className="k">Open sales orders</div><div className="v">{openSOs}</div></div>
        <div className="card"><div className="k">Confirmed revenue</div><div className="v">{money(revenue)}</div></div>
      </div>

      <h3>Low stock - needs reordering</h3>
      <div className="tablewrap">
        {low.length === 0 ? (
          <div className="empty">All products are above their reorder level.</div>
        ) : (
          <table>
            <thead>
              <tr><th>SKU</th><th>Product</th><th className="num">In stock</th><th className="num">Reorder level</th><th>Status</th></tr>
            </thead>
            <tbody>
              {low.map((p) => (
                <tr key={p.id}>
                  <td>{p.sku}</td>
                  <td>{p.name}</td>
                  <td className="num">{p.stock}</td>
                  <td className="num">{p.reorder_level}</td>
                  <td>{p.stock <= 0 ? <span className="badge bad">Out of stock</span> : <span className="badge warn">Low</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}
