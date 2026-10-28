import type { Product } from "@/lib/db";

// Four order-line rows. Empty rows are ignored by the server action.
export default function LineInputs({
  products,
  moneyKey,
  moneyLabel,
}: {
  products: Product[];
  moneyKey: "cost" | "price";
  moneyLabel: string;
}) {
  return (
    <div>
      {[1, 2, 3, 4].map((i) => (
        <div className="lines" key={i}>
          <div>
            {i === 1 && <label>Product</label>}
            <select name={`product_${i}`} defaultValue="">
              <option value="">- none -</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.sku} - {p.name} (stock {p.stock})
                </option>
              ))}
            </select>
          </div>
          <div>
            {i === 1 && <label>Quantity</label>}
            <input name={`qty_${i}`} type="number" min="1" step="1" placeholder="0" />
          </div>
          <div>
            {i === 1 && <label>{moneyLabel} (blank = default)</label>}
            <input name={`${moneyKey}_${i}`} type="number" min="0" step="0.01" placeholder="default" />
          </div>
        </div>
      ))}
    </div>
  );
}
