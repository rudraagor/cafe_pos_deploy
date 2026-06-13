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

| Surface | Route | Who uses it |
|---------|-------|-------------|
| **Admin** | `/admin` | Owners configure menu, floors, staff, coupons, bookings, reports |
| **POS** | `/pos` | Cashiers take dine-in & takeaway orders |
| **KDS** | `/kds` | Kitchen sees live tickets with age coloring & item check-off |
| **Receipts** | `/receipt/[orderId]` | Customers get a public digital receipt |

**End-to-end flow:** configure cafe → open POS session → order with modifiers → send to kitchen → KDS updates live → collect payment → receipt + reports update.

### Extras beyond the core brief

We went past a minimal POS demo with a few standout additions:

- **Marketing widget** — send coupon offers to customers from the reports dashboard (Resend email integration).
- **AI insights** — daily briefing, inventory forecast, and ask-a-question on aggregate sales data (OpenAI; graceful fallback when no API key).
- **Extensive promo configuration** — order thresholds, product quantity rules, searchable multi-select combos, dish-of-the-day, weekday/time windows, stackable vs exclusive discounts.
- **Table merging** — link multiple dine-in tables to one order; any merged table opens the active ticket.
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
      <img src="docs/screenshots/07-kds.png" alt="Kitchen Display" />
      <br /><sub><b>KDS</b> — live tickets, prep stages, overdue coloring</sub>
    </td>
  </tr>
  <tr>
    <td width="50%">
      <img src="docs/screenshots/04-admin-reports.png" alt="Reports" />
      <br /><sub><b>Reports</b> — KPIs, charts, exports, live refresh</sub>
    </td>
    <td width="50%">
      <img src="docs/screenshots/05-admin-coupons.png" alt="Coupons & Promotions" />
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
    R[Public Receipt]
  end

  subgraph App["Next.js 16 App (Node)"]
    SA[Server Actions]
    API[SSE Streams]
    AUTH[NextAuth JWT]
  end

  subgraph Data
    PG[(PostgreSQL 16)]
  end

  A --> SA
  P --> SA
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

| Service | URL |
|---------|-----|
| App (local) | http://localhost:3000 |
| Adminer | http://localhost:8080 |
| Postgres | `localhost:5433` |

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

| Role | Email | Password |
|------|-------|----------|
| **Admin** | `admin@cafe.test` | `admin1234` |
| **Cashier** | `cashier@cafe.test` | `cashier1234` |
| **More cashiers** | `priya@cafe.test`, `rahul@cafe.test`, … | `cashier1234` |
| **KDS PIN** | — | `2468` (override with `KDS_PIN`) |

After `pnpm db:seed:demo` you also get floors, tables, products, sample orders, and report history.

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
- **Reports** — paid-order revenue, multi-filter dashboard, CSV/XLSX/PDF export, SSE live refresh, OpenAI insights (optional)

</details>

<details>
<summary><strong>POS — waiter / cashier terminal</strong></summary>

- Session open/close with cash drawer summary
- Dine-in with table merge + floor map
- Takeaway flow
- Searchable product grid with category filters
- Cart modifiers, coupons, customer assign, discounts
- Send to kitchen → pay from saved order when ready
- Cash / card / UPI checkout with change & receipt print/email

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

| Layer | Choice |
|-------|--------|
| Framework | Next.js 16 App Router, Server Actions |
| Language | TypeScript, React 19 |
| Database | PostgreSQL 16, Drizzle ORM |
| Auth | NextAuth v5 credentials + JWT |
| UI | Tailwind CSS 4, Base UI / shadcn |
| Realtime | Server-Sent Events + in-process EventEmitter |
| Email | Resend + React Email |
| Charts | Recharts |
| AI | OpenAI Responses API (reports briefing / forecast) |
| Container | Docker multi-stage build + Compose |

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
7. Open **reports** → apply filters → export CSV → show AI insight (or graceful fallback)

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
- [`flows/`](flows/) — per-module readme walkthroughs
- [`docs/MILESTONE-*.md`](docs/) — build milestones & spec mapping

---

<p align="center">
  Built for <strong>Odoo Cafe POS</strong> · Chai Biskit Cafe · Vadodara
</p>
