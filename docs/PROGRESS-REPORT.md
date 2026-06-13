# Cafe POS — Progress Report

_As of Milestone 4 complete. Single coder; teammates provide assets (design, docs, seed content, QA)._

## Status at a glance

| Milestone | Scope | Status |
|-----------|-------|--------|
| M1 | Scaffold, Docker Postgres, Drizzle schema, Auth.js RBAC, route protection | ✅ Done |
| M2 | Admin backend config — full CRUD (products, categories, payment methods, floors/tables, coupons, promotions, users) | ✅ Done |
| M3 | POS terminal — sessions, tables, cart, pricing engine, discounts, customers, send-to-kitchen, orders list/detail | ✅ Done |
| M4 | Payments (cash / UPI QR / card) + receipts (print + public page + Resend email) + M3 bug fixes | ✅ Done |
| M5 | Kitchen Display System + realtime (SSE) | ⏳ Planned |
| M6 | Reporting / AI insights + live dashboard | 🔭 Future |

## Architecture (current)

- **Next.js 16 (App Router)** — three surfaces: `/admin` (admin-only), `/pos` (employees),
  `/kds` + `/receipt` (public).
- **PostgreSQL + Drizzle ORM** — 13 tables, snapshotting on order line items. Migrations in
  `lib/db/migrations`. Portable to Neon by swapping `DATABASE_URL`.
- **Auth.js (NextAuth v5)** — credentials + JWT carrying role; enforced in `proxy.ts` + `requireRole`.
- **Server Actions** everywhere with a standard `ActionResult` shape, Zod validation, and
  `revalidatePath` cache invalidation.
- **Zustand** per-table cart with `localStorage` persistence; **pure pricing engine** in
  `lib/pos/pricing.ts` (unit-tested).
- **shadcn/ui + Tailwind** for a clean "tool, not toy" employee UI.

## What works end-to-end today

Open session → pick table → build cart (live pricing, promotions, coupon) → assign customer →
Send to Kitchen (draft order persisted) → **Pay** (cash with change due / UPI QR / card) →
order flips to **paid**, table frees → **receipt**: printable slip + public `/receipt/[id]` page
with a QR + **emailed via Resend** (no-ops cleanly when no API key) → **Resend / Reprint** on paid
orders → close session with summary.

## M4 review findings

M4 passed typecheck (`tsc --noEmit`), lint (clean), and the pricing unit test.

**Done well**
- `takePayment` and `sendToKitchen` mutations are wrapped in `db.transaction()`.
- Only admin-enabled payment methods render; UPI requires a configured UPI ID (validated server-side).
- Receipt email failure never aborts payment (fire-and-forget after commit; soft toast on failure).
- "Send & Pay" one-tap flow + standalone Pay from order detail; cash quick-amount chips + live change.
- The M3 bugs from the prior review were all addressed (see below).

**M3 bugs — all fixed in M4**
1. ✅ `sendToKitchen` now transactional (delete/update/insert atomic).
2. ✅ Missing product returns a clean error instead of `throw`.
3. ✅ `generateOrderNumber` uses `max(suffix)` inside the txn + unique-violation retry (×3).
4. ✅ Editing a draft preserves existing `kdsStage` (no reset to `to_cook`).

**Minor follow-ups (non-blocking)**
- `paymentSchema.tendered` allows decimals fine, but consider rejecting `tendered` for non-cash
  methods explicitly (currently just ignored — harmless).
- Tax is computed per-line before order-level discounts (a deliberate, documented choice).
- KDS auth is intentionally open (`/kds` public) — decide on a PIN before production (tracked in M5).
- Single-payment-per-order assumed; `payments` table already supports splits if needed later.

## Risks / watch items

- **Realtime (M5)** is the biggest remaining build and the headline feature — start early.
- **Resend domain**: needs a verified sender (or use Resend's test sender) to demo real email.
- **In-memory SSE bus** is single-process only — fine for the demo, note the multi-instance swap.

## Next up (M5)

Realtime SSE bus + Kitchen Display board (3 columns, per-item check-off, stage advance, age coloring,
new-ticket sound). Plan: `docs/MILESTONE-5-KDS-REALTIME.md`. No schema migration required.
