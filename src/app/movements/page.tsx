import { db } from "@/lib/db";
import { when } from "@/lib/format";

export const dynamic = "force-dynamic";

type Move = { id: number; sku: string; name: string; change: number; reason: string; ref: string | null; created_at: string };

export default function Movements() {
  const rows = db
    .prepare(
      `SELECT m.id, p.sku, p.name, m.change, m.reason, m.ref, m.created_at
       FROM stock_movements m JOIN products p ON p.id = m.product_id
       ORDER BY m.id DESC LIMIT 200`
    )
    .all() as Move[];

  return (
    <>
      <h2>Stock ledger</h2>
      <p className="sub">Every stock change, newest first. Current stock is the sum of these rows.</p>
      <div className="tablewrap">
        {rows.length === 0 ? (
          <div className="empty">No movements yet.</div>
        ) : (
          <table>
            <thead><tr><th>#</th><th>When</th><th>Product</th><th className="num">Change</th><th>Reason</th><th>Reference</th></tr></thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td>{r.id}</td>
                  <td>{when(r.created_at)}</td>
                  <td>{r.sku} - {r.name}</td>
                  <td className={"num " + (r.change >= 0 ? "pos" : "neg")}>{r.change > 0 ? "+" : ""}{r.change}</td>
                  <td>{r.reason}</td>
                  <td>{r.ref ?? "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}
