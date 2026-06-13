# Cafe POS Test Flows

This guide maps the manual and automated test coverage to the flows in
`docs/Odoo Cafe POS.pdf`.

## Automated Smoke Tests

Run the lightweight TypeScript smoke tests with:

```bash
npm test
```

Current coverage:

- `lib/pos/pricing.test.ts`: verifies product promotions, order promotions,
  coupons, tax calculation, discount capping, and kitchen item metadata.
- `lib/pos/upi.test.ts`: verifies generated UPI payment URLs contain the payee,
  amount, currency, and order reference expected by the checkout QR flow.
- `lib/reports/range.test.ts`: verifies report presets, custom date ranges, and
  invalid range fallback behavior.

## Environment Setup

Use `.env.example` as the source of truth.

Minimum local values:

```bash
DATABASE_URL=postgresql://cafe:cafe@127.0.0.1:5433/cafepos
AUTH_SECRET=<openssl rand -base64 33>
AUTH_URL=http://localhost:3000
NEXT_PUBLIC_APP_URL=http://localhost:3000
KDS_PIN=2468
```

Receipt email via Resend:

```bash
RESEND_API_KEY=<resend_api_key>
RESEND_FROM="Cafe POS <receipts@your-verified-domain.com>"
```

Adding only `RESEND_API_KEY` is not enough. `RESEND_FROM` must also be set, and
the sender domain or address must be verified in Resend. Receipts are skipped
when either value is missing, when the order is not paid, or when the selected
customer has no email.

AI report insights:

```bash
OPENAI_API_KEY=<openai_api_key>
OPENAI_MODEL=gpt-4o-mini
```

`OPENAI_MODEL` is optional because the app falls back to `gpt-4o-mini`.
AI features live on `Admin -> Reports` and require an admin login. Missing keys
do not break reports; the AI actions return the setup message shown in the UI.

## Seed And Start

1. Install dependencies: `npm install`.
2. Start or connect Postgres.
3. Apply schema: `npm run db:push` or `npm run db:migrate`.
4. Seed bootstrap data: `npm run db:seed`.
5. Optional demo history (90 days of sessions/orders for reports and AI):
   `npm run db:seed:demo`.
6. Start the app: `npm run dev`.

### Demo seed (invigilator / judging)

After the base seed, load ~90 days of realistic paid orders, sessions, customers,
and extra menu items:

```bash
npm run db:seed
npm run db:seed:demo
```

Regenerate demo transactions from scratch:

```bash
npm run db:seed:demo -- --force
```

Demo logins (all cashiers use `cashier1234`):

- Admin: `admin@cafe.test` / `admin1234`
- Cashiers: `cashier@cafe.test`, `priya@cafe.test`, `rahul@cafe.test`,
  `ananya@cafe.test`, `vikram@cafe.test`

Suggested checks after demo seed:

- Admin -> Reports: KPIs and charts for Today, Last 7 days, This month
- Admin -> Reports -> Sessions: long list with varied cashiers
- Employee / session / product filters return different totals
- AI briefing opens in a formatted dialog (no raw `**markdown**`)

## Core Manual Flows

### 1. Auth And Session

1. Confirm `/signup` redirects to `/login`; public self-registration should not
   be available.
2. Log in with a seeded account or an account created by an admin.
3. Confirm successful auth lands in the POS area.
4. If no session is open, verify the session screen shows the last closed date
   and closing sales, then click `Open Session`.
5. Confirm the floor/table selection appears before order entry.
6. Close the session from the POS hamburger menu and verify the closing summary
   dialog shows total orders, closing sales, opened time, and closed time.
7. From the summary dialog, test `View reports`, `Back to POS`, and `Log out`.

Expected result: one open session per user, last closing sales are visible on the
next open-session screen, and closed sessions appear in reports.

### 2. Admin Catalog

1. Create a category with a distinct color.
2. Create a product with name, category, price, unit, tax, description, and
   kitchen item setting.
3. Create another product and use inline category creation from the product form.
4. Edit the category color.
5. Verify product cards, category filters, and cart/order line styling reflect
   the changed category color.
6. Archive/delete a product and confirm it disappears from POS product selection.

Expected result: catalog CRUD works and category color changes propagate across
backend and POS surfaces.

### 3. Payment Methods

1. Disable all methods and open checkout for a draft order.
2. Confirm checkout says no payment methods are enabled.
3. Enable cash and verify cash appears with tendered amount and change due.
4. Enable card and verify a transaction reference can be saved.
5. Enable UPI without a UPI ID and confirm validation blocks saving or payment.
6. Add a UPI ID, then verify checkout shows a QR/link with the order total.

Expected result: checkout only displays enabled methods and UPI requires a saved
UPI ID.

### 4. Coupons And Promotions

1. Create an active coupon with a percentage discount.
2. Create an active product promotion with minimum quantity.
3. Create an active order promotion with minimum order amount.
4. In POS, add enough quantity to trigger the product promotion.
5. Cross the order threshold to trigger the order promotion.
6. Apply the coupon code from the discount popup.
7. Verify line discount, order discount, coupon line, tax, and total.
8. Try an invalid code and confirm it is rejected.

Expected result: automated promotions apply without code entry, manual coupons
apply only through the popup, and totals match the order summary.

### 5. Dine-In Order To KDS

1. Select a floor and available table.
2. Type into the POS header product search and verify visible product cards
   filter by name.
3. Add kitchen products to cart.
4. Assign or create a customer.
5. Click `Send to Kitchen`.
6. Open `/kds`, enter `KDS_PIN`, and confirm the order appears under `To Cook`.
7. Use KDS ticket search, category filter, and product filter; verify stage
   counts and ticket contents update.
8. Click the ticket to move it to `Preparing`.
9. Click individual items and confirm strikethrough completion.
10. Complete all items and confirm the ticket moves to `Completed Recent`.

Expected result: KDS updates in real time, only kitchen items appear, and item
completion can drive the overall ticket stage.

### 6. Payment And Receipt

1. Open a draft order after the kitchen items are completed.
2. Pay with cash and verify change due is recorded.
3. Repeat with card and a reference.
4. Repeat with UPI after scanning or copying the UPI link.
5. Verify the order becomes paid and the table is released after the KDS ticket
   is completed.
6. Open the receipt page and test print controls.
7. With Resend configured and a customer email present, verify automatic receipt
   delivery after payment and manual resend from the order detail page.

Expected result: paid orders are view-only, receipts render, and email sending
works only when Resend and customer email are configured.

### 7. Orders And Customers

1. Create a draft order and confirm it appears in the current session orders.
2. Search by order number, customer, and date.
3. Open a draft order and verify `Edit Order` returns to a loaded cart.
4. Delete a draft order and confirm it disappears from table occupancy and KDS.
5. Pay an order and verify edit/delete controls are no longer available.
6. Create, edit, search, select, and delete customers from the POS customer page.

Expected result: draft orders are editable, paid orders are locked, and customer
email links to receipt delivery.

### 8. Table State

1. Start a dine-in order for a table.
2. Return to table view and confirm the table is visually occupied.
3. Try to create another active order on the same table.
4. Complete KDS and payment for the order.
5. Confirm the table becomes available again.

Expected result: active tables cannot be double-booked, and completed paid
orders no longer block the table.

### 9. Reports And AI

1. Create and pay orders across different products, categories, sessions, and
   payment methods.
2. Visit `Admin -> Reports`.
3. Check Today, Last 7 days, This Month, and Custom filters.
4. Verify whether Employee, Session, and Product filters exist and affect the
   dataset.
5. Verify KPI tiles show revenue, orders, AOV, gross, tax, discounts, items
   sold, and dine-in share with delta badges vs the prior period.
6. Use **Customize** to hide/show and reorder widgets; refresh the page and
   confirm layout persists in this browser.
7. Sort table columns (qty, revenue, amount, paid-at) ascending and descending
   in top products, categories, orders, live floor, and marketing tables.
8. Click a customer name in top orders or live floor and confirm the profile
   popup shows email/phone, range stats, and recent orders.
9. In **Customer marketing**, search customers, open a profile, and send an
   active coupon email when Resend is configured; confirm graceful errors when
   email is missing or Resend is unset.
10. Enable live reports if available and confirm paid orders publish report
    updates without exposing the stream to unauthorized users.
11. Export CSV, XLSX, and PDF and inspect comparison, employee, and
    fulfillment sections plus the selected filters.
12. With `OPENAI_API_KEY` set, generate the daily briefing, inventory forecast,
    and a grounded question answer. Use **Regenerate** to bypass cache, and test
    copy/download from the briefing dialog. Verify the answer is scoped to the
    selected filters.

Expected result: report data updates by range, widgets are configurable per
browser, tables sort client-side, CRM/marketing actions stay admin-only, and AI
responses use aggregate report context only.

## Current Coverage Gaps To Manually Watch

- Reports live updates should be verified with two browser sessions: one admin
  report page with live mode on, and one POS payment/close-session action.
- The POS header search input should still be verified separately because this
  pass focused on KDS search and reporting gaps.
- Receipt emails are sent during payment completion, so slow Resend responses
  can add checkout latency.
- Production receipt links depend on `NEXT_PUBLIC_APP_URL`; missing this value
  can produce localhost links in emails.
- There is no end-to-end/browser test suite yet, so the full click-through flows
  above remain manual.
