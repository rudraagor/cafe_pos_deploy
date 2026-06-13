# Team Tasks — Cafe POS (24h Hackathon)

One engineer (Aaditya) owns all coding. The other three drive design, docs/research, and
pitch/QA. Your deliverables directly unblock the build, so hit the early deadlines hard.

## What we're building (shared context)

A web Restaurant Point-of-Sale with three surfaces:

- **Admin backend** — configure products, categories, payment methods, floors/tables,
  coupons/promotions, employees; view reports.
- **POS terminal** — employee takes orders, applies discounts, sends to kitchen, takes payment.
- **Kitchen Display (KDS)** — real-time order tickets, advanced through To Cook → Preparing → Completed.

**The golden demo path (everything we present hangs off this):**
Login → open session → pick table → add products → apply discount/coupon → Send to Kitchen →
KDS updates live → advance tickets → payment (UPI QR + cash) → receipt (email + QR) →
close session → reports dashboard with live numbers + AI summary.

**Tech (FYI, not yours to manage):** Next.js + Postgres (Docker) + Drizzle + Auth.js +
Tailwind/shadcn. Source of truth spec: `docs/Odoo Cafe POS.pdf`.
Mockup link: https://link.excalidraw.com/l/65VNwvy7c4X/1Vvr9oy6B3F

## Roles & owners

- **Aaditya — Lead Engineer:** full build, milestone by milestone.
- **Person A — Design / Mockups**
- **Person B — Docs & Research**
- **Person C — Pitch, Seed Content & QA**

---

## Person A — Design / Mockups

Goal: remove all design decisions from the engineer's plate so implementation is 1:1.

Deliverables:
1. **Color system & brand** (by H+2): pick a cafe brand name + simple logo/wordmark, one accent
   color, and a **category color palette** (6–8 distinct, readable swatches for Coffee, Tea,
   Pastries, etc.). Category color is a real feature — it shows on POS product cards, filter tabs,
   and the order view.
2. **POS terminal mockups** (by H+5): floor pop-up (grid of table cards, occupied vs free),
   order view (product grid + cart + order summary + payment), discount popup, payment screens
   (cash change, UPI QR, card ref). Touch-friendly, big tap targets.
3. **KDS mockup** (by H+5): ticket card layout (order number, items, quantities), the 3 stage
   columns, and how a ticket looks as it ages (green → amber → red).
4. **Admin mockups** (by H+7, lower priority): list + create/edit dialog pattern for products,
   categories, etc. Clean and data-dense.

Format: Figma or Excalidraw frames, **matching shadcn/ui defaults** (neutral base, rounded cards,
standard spacing) so they're directly buildable. Annotate spacing/colors where it matters.

Acceptance: engineer can open a frame and build it without asking follow-up questions.

## Person B — Docs & Research

Goal: prove completeness to judges and keep the project documented.

Deliverables:
1. **Odoo POS research** (by H+3): skim how a real Odoo/Square restaurant POS handles order flow,
   sessions, and KDS. Write a half-page of "things real POS systems do" we can borrow. Judges may
   be Odoo folks — fidelity matters.
2. **Spec-coverage checklist** (living doc, owned start to finish): a table mapping **every**
   requirement in `docs/Odoo Cafe POS.pdf` (sections 2.1–2.9, 3.1–3.8, 4) to a status
   (Done / In progress / Not started). Update it as the engineer reports progress. This is gold
   during judging — it visually demonstrates we hit the brief.
3. **README** (by H+18): what it is, screenshots, tech stack, how to run (`docker compose up -d`
   then `pnpm dev`), seed logins, and the feature list.
4. **ER diagram** (by H+12): a simple diagram of the data model (ask engineer for the table list
   in `lib/db/schema.ts`) for the README and the pitch.

Acceptance: a stranger can read the README and run the app; the checklist is current at demo time.

## Person C — Pitch, Seed Content & QA

Goal: make the demo land, and feed the engineer realistic data early.

Deliverables:
1. **Seed menu content** (by H+3, HIGHEST PRIORITY): a realistic cafe menu the engineer drops
   straight into the seed script — categories (with Person A's colors), ~20–30 products with
   names, prices (INR), unit, tax %, a short description, and whether each is a kitchen item.
   Plus 1–2 floors with named/numbered tables, 1–2 coupons, and 1 promotion. Deliver as a simple
   table/CSV/markdown.
2. **Pitch deck** (by H+20): problem, our solution, the standout features (real-time everywhere,
   AI sales summary, KDS age-coloring, QR receipt), a short architecture slide, and the team.
3. **Demo script** (by H+20): a tight, rehearsed walkthrough that follows the golden demo path
   above, with who clicks what. Time it to ~4–5 minutes.
4. **QA pass** (H+19 → H+23): run the app, follow the demo script, and log every bug/rough edge in
   a shared list (steps to reproduce + severity). Re-test fixes.

Acceptance: deck + rehearsed script ready; seed content delivered early; QA list actively worked.

---

## Timeline checkpoints (relative to start)

- **H+3:** Person C seed content + Person B research done. Person A color system locked.
- **H+5:** Person A POS + KDS mockups done.
- **H+7:** Person A admin mockups done.
- **H+12:** ER diagram done.
- **H+18:** README done.
- **H+20:** Deck + demo script done.
- **H+19→23:** QA loop.

**Two things that save the engineer the most time — deliver these first:**
Person C's **seed menu content** and Person A's **locked mockups + color palette**.

## How to run (for QA / anyone)

```bash
docker compose up -d   # Postgres on :5433, Adminer DB browser on :8080
pnpm install
pnpm dev               # http://localhost:3000
```

Seed logins:
- Admin: `admin@cafe.test` / `admin1234`
- Employee: `cashier@cafe.test` / `cashier1234`

Browse the database at http://localhost:8080 (system: PostgreSQL, server: `db`, user/pass: `cafe`).
