<p align="center">
  <img src="public/logo.png" alt="Chai Biskit Cafe" width="220" />
</p>

<h1 align="center">Chai Biskit Cafe POS</h1>

<p align="center">
  A production-minded cafe point-of-sale built for the <strong>Odoo Hackathon</strong> brief —
  admin, waiter terminal, kitchen display, payments, reservations, reporting, and AI insights in one stack.
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Next.js-16-black?style=flat-square&logo=next.js" alt="Next.js 16" />
  <img src="https://img.shields.io/badge/TypeScript-5-3178C6?style=flat-square&logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/PostgreSQL-16-4169E1?style=flat-square&logo=postgresql&logoColor=white" alt="PostgreSQL" />
  <img src="https://img.shields.io/badge/Docker-Compose-2496ED?style=flat-square&logo=docker&logoColor=white" alt="Docker" />
  <img src="https://img.shields.io/badge/Drizzle-ORM-000?style=flat-square" alt="Drizzle ORM" />
  <img src="https://img.shields.io/badge/Realtime-SSE-FCE8BC?style=flat-square" alt="SSE Realtime" />
</p>

---

## Why this project stands out

| Surface      | Route                | Who uses it                                                      |
| ------------ | -------------------- | ---------------------------------------------------------------- |
| **Admin**    | `/admin`             | Owners configure menu, floors, staff, coupons, bookings, reports |
| **POS**      | `/pos`               | Cashiers take dine-in & takeaway orders                          |
| **QR Codes** | `/pos/qr-codes`      | Staff print/open customer table-order QR codes                    |
| **QR Queue** | `/pos/qr-orders`     | Waiters approve customer QR submissions before KDS                |
| **KDS**      | `/kds`               | Kitchen sees live tickets with age coloring & item check-off     |
| **Receipts** | `/receipt/[orderId]` | Customers get a public digital receipt                           |

**End-to-end flow:** configure cafe → open POS session → order with modifiers → send to kitchen → KDS updates live → collect payment → receipt + reports update.

### Extras beyond the core brief

We went past a minimal POS demo with a few standout additions:

- **Marketing widget** — send coupon offers to customers from the reports dashboard (Resend email integration).
- **AI insights** — daily briefing, inventory forecast, and ask-a-question on aggregate sales data (OpenAI; graceful fallback when no API key).
- **Extensive promo configuration** — order thresholds, product quantity rules, searchable multi-select combos, dish-of-the-day, weekday/time windows, stackable vs exclusive discounts.
- **Table merging** — link multiple dine-in tables to one order; any merged table opens the active ticket.
- **Offline kitchen sync** — the Zustand cart is persisted locally and Send to Kitchen queues orders when the browser is offline, then retries automatically when connectivity returns.
- **Blind cash reconciliation** — shift close asks for physical counted cash before revealing expected cash, variance, and closing totals.
- **Audit log** — admin-visible trail for session closes, payments, discount changes/use, stock status changes, draft deletes, and password/user changes.
- **Split payments** — one bill can be paid across cash, card, and UPI; receipts show every payment leg.
- **Customer QR ordering** — staff print per-table QR codes; customer orders enter as unapproved tickets and only reach KDS after waiter approval.
- **Lunch rush simulator** — one-click admin demo creates live paid orders and kitchen tickets over time so reports and KDS visibly update.
- **Receipts** — printable order receipts, public digital receipt links, QR codes, and optional email resend.
- **Customizable admin dashboards** — filterable reports (date, employee, session, product), live SSE refresh, CSV/XLSX/PDF export, and floor occupancy widget.

---

## Screenshots

<table>
  <tr>
    <td width="50%">
      <img src="docs/screenshots/01-login.png" alt="Login" />
      <br /><sub><b>Auth</b> — branded login with role-based redirect</sub>
    </td>
    <td width="50%">
      <img src="docs/screenshots/06-pos-takeaway.png" alt="POS Takeaway" />
      <br /><sub><b>POS</b> — searchable products, cart, send to kitchen</sub>
    </td>
  </tr>
  <tr>
    <td width="50%">
      <img src="docs/screenshots/03-admin-products.png" alt="Admin Products" />
      <br /><sub><b>Admin</b> — products, modifiers, stock, categories</sub>
    </td>
    <td width="50%">
      <img src="docs/screenshots/07-kds_1.png" alt="Kitchen Display" />
      <br /><sub><b>KDS</b> — live tickets, prep stages, overdue coloring</sub>
    </td>
  </tr>
  <tr>
    <td width="50%">
      <img src="docs/screenshots/04-admin-reports_1.png" alt="Reports" />
      <br /><sub><b>Reports</b> — KPIs, charts, exports, live refresh</sub>
    </td>
    <td width="50%">
      <img src="docs/screenshots/05-admin-coupons_1.png" alt="Coupons & Promotions" />
      <br /><sub><b>Discounts</b> — coupons, combos, happy-hour promos</sub>
    </td>
  </tr>
</table>

---

## Architecture

```mermaid
flowchart TB
  subgraph Clients
    A[Admin Browser]
    P[POS Terminal]
    K[Kitchen Tablet]
    Q[Customer Phone]
    R[Public Receipt]
  end

  subgraph App["Next.js 16 App (Node)"]
    SA[Server Actions]
    API[Route Handlers + SSE Streams]
    AUTH[NextAuth JWT]
  end

  subgraph Data
    PG[(PostgreSQL 16)]
  end

  A --> SA
  P --> SA
  Q --> API
  K --> API
  A --> API
  R --> SA
  SA --> AUTH
  SA --> PG
  API --> PG
```

```mermaid
sequenceDiagram
  participant Waiter as POS Terminal
  participant API as Next.js Server
  participant DB as PostgreSQL
  participant KDS as Kitchen Display

  Waiter->>API: Send order to kitchen
  API->>DB: Save draft order + items
  API-->>KDS: SSE kds:changed event
  KDS->>API: Refresh tickets
  KDS->>API: Mark items complete
  API->>DB: Update kdsStage
  API-->>Waiter: SSE (table view refresh)
  Waiter->>API: Collect payment
  API->>DB: Mark paid + receipt
```

---

## Docker — yes, the whole app is dockerized

You have **two ways** to run the project:

### Option A — Database only (best for daily dev)

Runs Postgres + Adminer in Docker; Next.js stays on your machine (fast hot reload).

```bash
docker compose up db adminer -d
cp .env.example .env.local   # DATABASE_URL -> localhost:5433
pnpm install
pnpm db:setup:demo
pnpm dev
```

| Service     | URL                   |
| ----------- | --------------------- |
| App (local) | http://localhost:3000 |
| Adminer     | http://localhost:8080 |
| Postgres    | `localhost:5433`      |

### Option B — Full stack in Docker (best for judges / one-command demo)

Runs **Postgres + Adminer + the Next.js web app** together.

```bash
docker compose up --build -d
docker compose exec app pnpm db:seed:demo   # first time only
```

Open http://localhost:3000 — no local Node install required after the image is built.

The app container automatically:

1. Waits for Postgres to be healthy
2. Runs `pnpm db:migrate`
3. Starts `pnpm start` on port 3000

---

## Quick start (local development)

```bash
git clone https://github.com/Aaditya-T/cafe_pos.git
cd cafe_pos
pnpm install
docker compose up db -d
cp .env.example .env.local
```

Fill `.env.local`:

```env
DATABASE_URL=postgresql://cafe:cafe@127.0.0.1:5433/cafepos
AUTH_SECRET=<openssl rand -base64 33>
AUTH_URL=http://localhost:3000
NEXT_PUBLIC_APP_URL=http://localhost:3000
KDS_PIN=2468
```

Bootstrap data & run:

```bash
pnpm db:setup:demo
pnpm dev
```

---

## Demo credentials

| Role              | Email                                   | Password                         |
| ----------------- | --------------------------------------- | -------------------------------- |
| **Admin**         | `admin@cafe.test`                       | `admin1234`                      |
| **Cashier**       | `cashier@cafe.test`                     | `cashier1234`                    |
| **More cashiers** | `priya@cafe.test`, `rahul@cafe.test`, … | `cashier1234`                    |
| **KDS PIN**       | —                                       | `2468` (override with `KDS_PIN`) |

After `pnpm db:seed:demo` you also get floors, tables, products, sample orders, and report history.

### Rich mock data for charts (recommended for demos)

**You do not need to enter this by hand.** A procedural bulk generator creates a realistic cafe dataset:

```bash
pnpm db:seed          # base catalog + admin (first time)
pnpm db:seed:demo:bulk   # ~300 products, ~40 staff, ~440 customers, 12 coupons, 6 months of paid orders
```

Or customize:

```bash
pnpm db:seed:demo -- --bulk --force --days=365
pnpm db:seed:demo -- --bulk --force --days=365 --volume=1.5 --products=300 --employees=40 --customers=500
```

| Flag          | Default (bulk) | What it controls                         |
| ------------- | -------------- | ---------------------------------------- |
| `--days`      | `180`          | How many days of paid order history      |
| `--volume`    | `1.65`         | Order density multiplier (busier charts) |
| `--products`  | `300`          | Catalog size                             |
| `--employees` | `35`           | Cashier accounts                         |
| `--customers` | `400`          | CRM customers                            |
| `--force`     | off            | Wipe demo orders/sessions and regenerate |

**Yes — `--days=365` works** and gives you a full year of varied sales data. Expect ~15–18k paid orders at default volume (takes a few minutes to insert).

| Generated     | Approx. volume                                                                           |
| ------------- | ---------------------------------------------------------------------------------------- |
| Products      | ~300 across 12 categories                                                                |
| Employees     | ~40 cashier accounts                                                                     |
| Customers     | ~440 (mix of email + walk-in phone)                                                      |
| Coupons       | 12 varied codes                                                                          |
| Order history | 180 days by default (~8–9k paid orders)                                                  |
| Patterns      | Weekends busier, lunch/evening peaks, seasonal waves, bestseller skew, UPI/cash/card mix |

Re-run with `--force` to wipe demo transactions and regenerate history. Charts, exports, employee filters, and AI insights all reflect this data.

---

## Feature map

<details>
<summary><strong>Admin — configuration & analytics</strong></summary>

- **Products** — price, tax, kitchen flag, out-of-stock, prep modifiers (Jain, Less sugar, allergen notes, …)
- **Categories** — unique color accents synced to POS grid
- **Payment methods** — cash, card, UPI (QR generation)
- **Coupons & promotions** — manual codes, QR scan, order thresholds, combos, dish-of-the-day, searchable product pickers
- **Booking** — floors, tables, reservations with overlap checks & confirmation email
- **Users** — admin/employee roles, password reset, safe archive rules
- **Audit Log** — operational event trail for cash close, payments, discounts, stock, users, and void-like deletes
- **Reports** — paid-order revenue, multi-filter dashboard, CSV/XLSX/PDF export, SSE live refresh, lunch rush simulator, OpenAI insights (optional)

</details>

<details>
<summary><strong>POS — waiter / cashier terminal</strong></summary>

- Session open/close with cash drawer summary
- Dine-in with table merge + floor map
- Takeaway flow
- Searchable product grid with category filters
- Cart modifiers, coupons, customer assign, discounts
- Send to kitchen → pay from saved order when ready
- Offline send-to-kitchen queue with automatic reconnect sync
- Cash / card / UPI checkout, split payments, change & receipt print/email

</details>

<details>
<summary><strong>KDS — kitchen display</strong></summary>

- PIN-gated public route for wall tablets
- Live SSE refresh (no manual reload)
- To Cook → Preparing → Completed pipeline
- Per-item check-off with strikethrough
- Ticket age colors: green / amber / red
- Modifier & note highlights on tickets

</details>

---

## Tech stack

| Layer     | Choice                                             |
| --------- | -------------------------------------------------- |
| Framework | Next.js 16 App Router, Server Actions              |
| Language  | TypeScript, React 19                               |
| Database  | PostgreSQL 16, Drizzle ORM                         |
| Auth      | NextAuth v5 credentials + JWT                      |
| UI        | Tailwind CSS 4, Base UI / shadcn                   |
| Realtime  | Server-Sent Events + in-process EventEmitter       |
| Email     | Resend + React Email                               |
| Charts    | Recharts                                           |
| AI        | OpenAI Responses API (reports briefing / forecast) |
| Container | Docker multi-stage build + Compose                 |

---

## Deploy to Railway

1. Create a Railway project with **PostgreSQL** + **GitHub web service**
2. Link `DATABASE_URL` from Postgres → web service
3. Set env vars: `AUTH_SECRET`, `AUTH_TRUST_HOST=true`, `AUTH_URL`, `NEXT_PUBLIC_APP_URL`, `KDS_PIN`
4. Generate a public domain, redeploy after setting URLs
5. Migrations run automatically via `railway.toml` (`pnpm db:migrate && pnpm build`)

**Local migrate against Railway DB:** use the **public** Postgres URL (`*.proxy.rlwy.net`), not `postgres.railway.internal`.

```bash
pnpm db:test      # verify connection
pnpm db:migrate
pnpm db:seed:demo
```

Keep **1 replica** on the web service so KDS SSE stays in sync (in-memory event bus).

---

## Share with friends (local tunnel)

```bash
pnpm dev
cloudflared tunnel --url http://localhost:3000
```

Set `AUTH_URL` and `NEXT_PUBLIC_APP_URL` to the tunnel URL, add `AUTH_TRUST_HOST=true`, restart dev.

---

## Demo Flow

1. Log in as **admin** → show products, categories, booking, coupons
2. Log in as **employee** → open POS session
3. Start **takeaway** or **dine-in** (merge tables optional)
4. Add a product with a modifier → **Send to kitchen**
5. Open **`/kds`** on a second screen → unlock with PIN → complete ticket live
6. Return to order → **collect payment** → view/print receipt
7. Try **split payment** → mix cash/card/UPI and show receipt payment breakdown
8. Close the session → enter counted cash first → reveal expected cash and variance
9. Open **reports** → enable Live → click **Lunch rush** → KDS/reports update over time
10. Open **Audit Log** → show payment, discount, close-session, stock/user trail
11. Export CSV/PDF/XLSX → show AI insight (or graceful fallback)

---

## Project structure

```
app/
  (auth)/          Login & signup
  (dashboard)/
    admin/         Back-office modules
    pos/           Waiter terminal
  kds/             Kitchen display
  api/kds/stream   SSE for kitchen
  api/reports/stream
components/        UI + POS + admin shells
lib/db/            Drizzle schema & migrations
lib/pos/           Pricing, cart, queries
docker-compose.yml Postgres + Adminer + App
Dockerfile         Production image
railway.toml       Cloud deploy config
docs/screenshots/  README visuals
flows/             Feature walkthrough notes
```

---

## Verification

```bash
pnpm lint
pnpm exec tsc --noEmit
pnpm test
pnpm build
```

---

## Realtime note

KDS and report dashboards use an **in-process EventEmitter** — perfect for demo/single-server deploy (Docker, Railway 1 replica). For multi-instance production, swap the bus for Redis or Postgres `LISTEN/NOTIFY` (interface is already isolated in `lib/realtime/`).

---

## Documentation

- [`docs/TEST_FLOWS.md`](docs/TEST_FLOWS.md) — manual QA checklist
- [`docs/SECURITY-RATE-LIMITS.md`](docs/SECURITY-RATE-LIMITS.md) — endpoint/action rate-limit policy
- [`flows/`](flows/) — per-module readme walkthroughs
- [`docs/MILESTONE-*.md`](docs/) — build milestones & spec mapping

---

<p align="center">
  Built for <strong>Odoo Cafe POS</strong> · Chai Biskit Cafe · Vadodara
</p>
