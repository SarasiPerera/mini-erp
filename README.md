# Mini ERP

A small ERP core built with **Next.js (App Router), TypeScript and SQLite**. It models the two loops almost every ERP is built on:

- **Purchase-to-stock:** Purchase Order -> receive goods -> stock increases
- **Order-to-cash:** Sales Order -> confirm -> stock decreases (overselling is blocked)

Everything runs locally with no database setup: clone, install, start.

## Features

- Products with SKU, cost, price and reorder level
- Suppliers and customers
- Purchase orders (multi-line) with a **Receive goods** action
- Sales orders (multi-line) with **Confirm** and **Cancel**, and a stock check on confirm
- **Stock ledger:** every change is recorded, and current stock is the sum of ledger rows
- Dashboard: stock value, low-stock items, open orders, confirmed revenue
- Demo data is created on first run
- Light and dark mode

## Quick start

Requires **Node.js 20 or newer**.

```bash
npm install
npm run dev
```

Open http://localhost:3000.

For a production build:

```bash
npm run build
npm start
```

To wipe the database and get fresh demo data:

```bash
npm run seed
```

Then restart the server.

## Try the flow

1. Open **Sales orders**, create an order for 10 x *Ceylon Tea 400g*, then click **Confirm**.
   It is refused: only 6 are in stock.
2. Open **Purchase orders**, order 20 x *Ceylon Tea 400g* from a supplier, then click **Receive goods**.
3. Go back to the sales order and click **Confirm**. It now works.
4. Open **Stock ledger** to see the opening stock, the purchase (+20) and the sale (-10).

## Design notes

**Stock is a ledger, not a number.** Think of a bank account: you never edit the balance, you record deposits and withdrawals, and the balance is their sum. Here, `stock_movements` is the ledger and stock is `SUM(change)`. This gives a full audit trail and makes it impossible for a stored quantity to drift out of sync.

**Business rules run in one transaction.** Confirming a sales order checks stock for every line and writes all ledger rows inside a single SQLite transaction (`better-sqlite3`), so a half-confirmed order cannot happen. Quantities for a product that appears on several lines are summed before the stock check.

**Server Actions, no API layer.** Forms post straight to server actions in `src/lib/actions.ts`, and pages are server components, so the app works without client-side JavaScript.

## Project structure

```
src/
  app/                 pages (dashboard, products, suppliers, customers,
                       purchase-orders, sales-orders, movements)
  components/          shared UI (party page, line inputs, error banner)
  lib/
    db.ts              schema, demo seed data, stock queries
    actions.ts         server actions: all business rules live here
    format.ts          currency and date helpers
scripts/reset.mjs      deletes the local database
data/                  SQLite file is created here (git-ignored)
```

## Database

`products`, `parties` (supplier or customer), `purchase_orders` + `purchase_order_items`, `sales_orders` + `sales_order_items`, `stock_movements`.

## Roadmap

- Authentication and role-based access
- Invoices and payments (order-to-cash completion)
- Reports and CSV export
- Integration with Zoho Inventory / Zoho Books through their REST APIs

## Tech

Next.js 15, React 19, TypeScript, better-sqlite3.

## License

MIT
