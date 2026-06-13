# Milestone 4 — Payments & Receipts

Goal: complete the order lifecycle. A cashier can take payment for a draft order (cash / UPI QR /
card), the order flips to `paid`, change is computed, a payment record is stored, and the customer
gets a receipt — printable in-browser and emailed via Resend. This closes spec section 3.5.
KDS + realtime moves to M5.

Not started yet — this is the plan. Scope is full (nothing trimmed).

## Outcome / definition of done

- From an order's detail (or directly from the order view), the cashier opens a **Payment dialog**.
- Only payment methods enabled in admin config appear (cash / card / upi).
- **Cash:** enter tendered amount → live **change due** → confirm.
- **UPI:** render a scannable **UPI QR** (built from the configured UPI ID + amount) → confirm.
- **Card:** optional reference field → confirm.
- On confirm: a `payments` row is written, `orders.status` → `paid`, the table frees up
  (occupied-table logic already keys off non-paid orders), and the cart for that table is cleared.
- A **receipt** is generated: a clean print view (`window.print()` with print CSS) and a Resend
  email to the customer (if a customer with an email is attached), using a React Email template.
- A public **digital receipt page** (`/receipt/[orderId]`) is the email's link target and can be
  encoded as a QR on the printed receipt.
- Paid orders are view-only and show the payment breakdown + a "Reprint / Resend" affordance.
- All of this is wrapped in transactions; the M3 bugs below are fixed along the way.

## M3 bug fixes (do these first)

These were found reviewing M3 and are folded into M4 cleanup:

1. **Wrap `sendToKitchen` mutations in `db.transaction()`** — the edit path does
   `delete orderItems → update orders → insert orderItems` as separate statements; a mid-way
   failure corrupts the order. (`app/(pos)/pos/actions.ts`)
2. **Graceful error instead of `throw`** — replace `throw new Error("Product not found")` in
   `sendToKitchen` with a returned `{ ok: false, error }`.
3. **`generateOrderNumber` race** — derive the next suffix from `max(orderNumber)` (or a per-session
   counter) inside the same transaction, with a unique-violation retry, instead of `count + 1`.
   (`lib/pos/queries.ts`)
4. **`kdsStage` reset on edit** — editing a draft currently resets `kdsStage` to `to_cook`.
   Harmless now, but matters once KDS is live (M5). Decide: lock editing once a ticket is started,
   or preserve `kdsStage` on re-send. For M4, preserve existing `kdsStage` on the edit path.

## Shared foundation (build first)

1. **Dependencies:** add `resend`, `react-email` + `@react-email/components`, and a small QR lib
   (`qrcode` for server-side data-URL generation, or render an `<svg>` QR client-side). Add
   `RESEND_API_KEY` and `RESEND_FROM` (e.g. `Cafe <receipts@yourdomain>`) to `.env.local` /
   `.env.example`. Add `NEXT_PUBLIC_APP_URL` for absolute links in emails.
2. **Validation:** `lib/validations/payment.ts` — zod schema for `{ orderId, method, tendered?,
   reference? }`; cash requires `tendered >= total`.
3. **Pricing reuse:** payment recomputes nothing — it reads the persisted order total
   (authoritative). Add a `getPayableOrder(orderId)` query that returns a draft order + items +
   customer for the dialog.
4. **Queries:** `getOrderForReceipt(orderId)` (order + items + payments + customer + table + coupon)
   for both the receipt page and the email.
5. **UPI helper:** `lib/pos/upi.ts` — build a `upi://pay?pa=<upiId>&pn=<name>&am=<amount>&cu=INR&tn=<orderNo>`
   string from the enabled UPI method's `upiId` + order amount; feed it to the QR.

## Build order

### 1. `takePayment` server action — `app/(pos)/pos/actions.ts` (spec 3.5)
- `requireUser`, validate payload, load the draft order (must be `status = draft`).
- In a `db.transaction()`: insert `payments` row (`method`, `amount = order.total`,
  `changeDue = tendered - total` for cash, `reference` for card/upi), update `orders.status = "paid"`.
- `revalidatePath` for `/pos`, `/pos/orders`, `/pos/tables`.
- Fire receipt email **after** the transaction commits (don't block/abort payment on email failure;
  log + surface a soft toast if it fails).
- Return `{ ok, orderId }` so the client can clear the table cart and route to the receipt.

### 2. Payment dialog — `components/pos/payment-dialog.tsx`
- Props: order summary (number, total) + enabled methods (+ UPI id).
- Tabs/segmented control for the enabled methods only.
- **Cash:** number input for tendered, quick-amount chips (exact, next round numbers), live change due.
- **UPI:** QR rendered from `lib/pos/upi.ts`, plus the UPI id as copyable text; "Mark paid" confirm.
- **Card:** optional reference input; "Mark paid" confirm.
- Submit → `takePayment` → on success: `clearTable(tableId)`, toast, route to `/pos/orders/[id]`
  (now paid) or open the receipt.

### 3. Wire payment entry points
- Add a **Pay** button to the order view's Payment section (`components/pos/order-summary.tsx`,
  replacing the "coming next milestone" placeholder) — but note an order must be a saved draft to be
  paid, so the natural flow is: Send to Kitchen → order detail → Pay. Decide whether to also allow
  "Send & Pay" in one step (recommended: a second button that sends then immediately opens payment).
- Add a **Pay** button to `components/pos/order-detail-actions.tsx` for `status = draft`.

### 4. Receipt — print view + digital page
- `components/pos/receipt.tsx` — a presentational receipt (cafe header, order no, datetime, table,
  cashier, line items, subtotal/discounts/tax/total, payment method + change, "Thank you", QR to the
  digital receipt). Shared by the print view and the page.
- `app/receipt/[orderId]/page.tsx` — **public** route (add to `proxy.ts` allowlist) that renders the
  receipt for a paid order; this is the email link + printed-QR target.
- Print: a "Print receipt" button using a print-targeted layout (`@media print` CSS) so a thermal /
  A4 printer gets a clean slip.

### 5. Email via Resend — `lib/email/`
- `emails/receipt-email.tsx` — React Email template mirroring the receipt (logo, order summary,
  total, link to `/receipt/[orderId]`).
- `lib/email/send-receipt.ts` — `resend.emails.send({ from, to, subject, react })`; no-op with a
  warning if `RESEND_API_KEY` is unset (so local dev without a key still works).
- Called from `takePayment` (fire-and-forget) and from a manual **"Resend receipt"** action on paid
  orders.

### 6. Paid-order view
- Order detail for `status = paid`: show payment method, amount, change, reference; replace
  draft actions with **Print** and **Resend receipt** buttons. (`order-detail-actions.tsx`,
  `orders/[orderId]/page.tsx`)

## Standout / polish (time permitting)
- Quick-cash chips + keypad for fast tendering.
- UPI QR with the cafe logo in the center.
- "Email sent ✓" confirmation + delivery status toast.
- Split summary: show change due prominently for cash (big number, the #1 cashier need).

## Open questions
- **Split payments / partial payment?** Spec implies one payment per order; plan assumes single
  full payment (`amount = total`). Add split later if needed (the `payments` table already supports
  multiple rows per order).
- **Refunds / void after paid?** Out of scope for M4 unless requested.
- **Receipt branding:** need cafe name + logo asset from the design teammate (TEAM-TASKS).

## Team assets needed (TEAM-TASKS)
- Cafe name, logo, address line, and footer text for receipts.
- A verified Resend sender domain (or use Resend's onboarding/test sender for the demo).
- Sample customer with a real inbox to demo the emailed receipt.
