import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "Mini ERP",
  description: "Inventory, purchasing, sales and a stock ledger.",
};

const NAV = [
  ["/", "Dashboard"],
  ["/products", "Products"],
  ["/suppliers", "Suppliers"],
  ["/customers", "Customers"],
  ["/purchase-orders", "Purchase orders"],
  ["/sales-orders", "Sales orders"],
  ["/movements", "Stock ledger"],
] as const;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <div className="shell">
          <nav className="side">
            <h1>Mini ERP</h1>
            {NAV.map(([href, label]) => (
              <Link key={href} href={href}>
                {label}
              </Link>
            ))}
          </nav>
          <main className="main">{children}</main>
        </div>
      </body>
    </html>
  );
}
