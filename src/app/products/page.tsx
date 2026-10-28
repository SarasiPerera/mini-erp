import { listProducts } from "@/lib/db";
import { createProduct } from "@/lib/actions";
import { money } from "@/lib/format";
import ErrorBanner from "@/components/ErrorBanner";

export const dynamic = "force-dynamic";

export default async function Products({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  const products = listProducts();

  return (
    <>
      <h2>Products</h2>
      <p className="sub">Stock is calculated from the ledger, never edited by hand.</p>
      <ErrorBanner message={error} />

      <div className="tablewrap">
        {products.length === 0 ? (
          <div className="empty">No products yet.</div>
        ) : (
          <table>
            <thead>
              <tr><th>SKU</th><th>Name</th><th className="num">Cost</th><th className="num">Price</th><th className="num">In stock</th><th>Status</th></tr>
            </thead>
            <tbody>
              {products.map((p) => (
                <tr key={p.id}>
                  <td>{p.sku}</td>
                  <td>{p.name}</td>
                  <td className="num">{money(p.cost)}</td>
                  <td className="num">{money(p.price)}</td>
                  <td className="num">{p.stock}</td>
                  <td>
                    {p.stock <= 0 ? <span className="badge bad">Out</span>
                      : p.stock <= p.reorder_level ? <span className="badge warn">Low</span>
                      : <span className="badge ok">OK</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <h3>Add product</h3>
      <form className="panel" action={createProduct}>
        <div className="grid">
          <div><label>SKU</label><input name="sku" required /></div>
          <div><label>Name</label><input name="name" required /></div>
          <div><label>Cost</label><input name="cost" type="number" min="0" step="0.01" defaultValue="0" /></div>
          <div><label>Price</label><input name="price" type="number" min="0" step="0.01" defaultValue="0" /></div>
          <div><label>Reorder level</label><input name="reorder_level" type="number" min="0" step="1" defaultValue="5" /></div>
          <div><label>Opening stock</label><input name="opening_stock" type="number" min="0" step="1" defaultValue="0" /></div>
        </div>
        <p><button type="submit">Add product</button></p>
      </form>
    </>
  );
}
