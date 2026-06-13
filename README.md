## 📊 Odoo Spec-Coverage Checklist

This interactive matrix tracks our full-stack compliance against the official requirements outlined in `docs/Odoo Cafe POS.pdf`.


### 🧱 1. Backend Administration (User Portal)
- [x] **[2.1] Login & Signup** — Opens active POS session automatically on success.
- [x] **[2.2] Product CRUD** — Supports product name, price, tax, and unit of measure with inline category creation.
- [x] **[2.3] Category Color Sync** — Global color system reflecting instantly across views on update.
- [x] **[2.4] Payment Configs** — Feature toggles for Cash, Card, and dynamic UPI QR generation.
- [x] **[2.5] Floor Plan & Tables** — Configures restaurant layouts mapping directly to the active terminal grid.
- [x] **[2.6] Coupons & Promos** — Handles manual code inputs + automated volume/amount triggers.
- [x] **[2.7] Employee Directory** — Role assignment, active password resets, and account archiving.
- [x] **[2.8] Session Lifecycle** — Logs cash drawer balances, shift starts, and final closing sales summary.
- [x] **[2.9] Analytics Dashboard** — Real-time charts, metrics filtering, and PDF/XLS report export.

### 💻 2. POS Terminal 
- [x] **[3.1] Navigation Header** — Live search, current table indicator, and quick-menu navigation dropdown.
- [x] **[3.2] Floor Pop-up Grid** — Displays real-time occupied vs. free table cards with seat counts.
- [x] **[3.3] Order View & Cart** — Product grid filtering, item lines with line-level discounts, and Send-to-Kitchen action.
- [x] **[3.4] Coupon Dialog** — Manual coupon validation overlay handler in cart summary.
- [x] **[3.5] Checkout Gateways** — Cash change math, UPI QR display, reference tracking, and email dispatch.
- [x] **[3.6] Order Ledger** — Reloads `Draft` orders for editing; locks `Paid` entries as view-only.
- [x] **[3.7] Table View State** — Dynamic visual updates mapping table order states across floors.
- [x] **[3.8] Customer CRM** — Guest registration and direct linking to digital checkout receipts.

### 🍳 3. Kitchen Display System (KDS)
- [x] **[4.0] Live Order Pipeline** — Real-time order tickets syncing instantly across To Cook ➔ Preparing ➔ Completed.
- [x] **[4.0] Ticket Aging Visuals** — Automatic color degradation (Green ➔ Amber ➔ Red) based on live elapsed time.
- [x] **[4.0] Granular Tracking** — Interactive line-item click with text-strikethrough state for partial ticket prep.
