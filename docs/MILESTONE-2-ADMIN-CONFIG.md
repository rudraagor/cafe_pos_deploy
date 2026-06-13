# Milestone 2 — Admin Backend Config (CRUD)

Goal: the admin (User role) can fully configure the cafe before/after POS sessions. Build all
backend management modules from spec sections 2.2–2.7. This is the data foundation the POS
terminal, KDS, and reports will consume in later milestones.

Not started yet — this is the plan. Scope is full (nothing trimmed).

## Outcome / definition of done

- Admin can create, list, edit, and delete: products, categories, payment methods, floors/tables,
  coupons, promotions, and users/employees.
- All forms validate input and surface errors; all lists update immediately after a mutation.
- Category color is stored and rendered consistently (POS will read it live later).
- Inline category creation works from inside the product form.
- All `/admin/*` routes are admin-only (already enforced by `proxy.ts` + `requireRole`).

## Shared foundation (build first — every module reuses this)

1. **Dependencies / components:** add `zod`, `react-hook-form`, `@hookform/resolvers`; add shadcn
   components `form`, `switch`, `popover`, `command` (combobox), `alert-dialog`, `textarea`.
2. **Validation schemas:** `lib/validations/*.ts` — one zod schema per entity, shared between the
   server action and the client form.
3. **Server action result type:** standardize a `ActionResult = { ok: true } | { ok: false; error: string; fieldErrors?: ... }` and `revalidatePath` after each mutation. Wrap each module's
   actions in `app/(admin)/admin/<entity>/actions.ts` with `"use server"` + `requireRole("admin")`.
4. **Reusable UI pattern:**
   - `components/admin/page-header.tsx` (title + primary action button).
   - `components/admin/data-table-shell.tsx` — a simple shadcn `Table` wrapper with a search input
     and empty state (TanStack Table is overkill for 24h; client-filter the rows).
   - `components/admin/form-dialog.tsx` — dialog wrapper hosting a react-hook-form form; handles
     submit → server action → toast (sonner) → close + refresh.
   - `components/admin/delete-button.tsx` — `alert-dialog` confirm → delete action.
5. **Pattern per module:** server component page fetches rows via Drizzle and renders the table;
   a client "New/Edit" dialog posts to the server action; `revalidatePath` refreshes the list.

## Modules (build in this order)

### 1. Categories — `/admin/categories` (spec 2.3)
- Fields: Name, Color.
- Color UI: a palette of preset swatches (from Person A) plus a hex `<input type="color">`.
- CRUD. Delete sets product.category_id to null (schema already `onDelete: set null`).
- Build first: products depend on categories.

### 2. Products — `/admin/products` (spec 2.2)
- Fields: Name, Category, Price, Unit of Measure (piece/kg/litre), Tax %, Description,
  Is Kitchen Item (toggle).
- **Inline category create:** Category field is a combobox (`command` + `popover`); typing a new
  name shows a "Create '<name>'" option that calls `createCategory` and selects it without leaving
  the form.
- CRUD. Show category color chip in the list.

### 3. Payment Methods — `/admin/payment-methods` (spec 2.4)
- Three fixed rows (cash, card, upi) seeded already; admin edits, doesn't create.
- Each: enable/disable `switch`. UPI row also has a UPI ID input (e.g. `cafe@ybl`), required when
  UPI is enabled. (QR generation itself is a later POS milestone.)

### 4. Floors & Tables — `/admin/booking` (spec 2.5)
- Note: the backend nav item is labeled "Booking"; it maps to Floor Plan & Table Management
  (the spec has no separate booking/reservation feature). See open question below.
- Floors: create/list/edit/delete (Name).
- Tables nested under a floor: Table Number, Number of Seats, Active status. CRUD.
- UI: floors as sections, tables as a grid/list under each.

### 5. Coupons & Promotions — `/admin/coupons` (spec 2.6)
- Two tabs on one page.
- **Coupons:** Code, Discount Type (percent/fixed), Value, Active. CRUD. (Employee types the code
  in POS later.)
- **Promotions (automated):** Name, Scope (product/order), Discount Type, Value, Active.
  - Scope = product → requires Product select + Minimum Quantity.
  - Scope = order → requires Minimum Order Amount.
  - Conditional fields render based on scope. CRUD.

### 6. Users / Employees — `/admin/users` (spec 2.7)
- List all accounts; show name, email, role, archived state.
- Add: Name, Email, Role (admin/employee), initial Password (bcrypt hash, reuse hashing from auth).
- Per-record actions: **Change Password**, **Archive** (set `archived_at`, account can't log in —
  already checked in `auth.ts`), **Delete**.
- Guard: prevent an admin from archiving/deleting their own account or the last remaining admin.

## Out of scope for Milestone 2

POS terminal, KDS, payments, receipts, reports/dashboard, AI summary, real-time push. Category
color "reflecting everywhere automatically" is satisfied because the POS will read color from the
DB live in its milestone — no extra work here beyond storing it.

## Open questions / assumptions

1. **"Booking" nav item:** assumed to mean Floor & Table management (spec describes no separate
   reservation system). If a table-reservation feature is intended, flag it and we'll scope it.
2. **Reports nav** is handled in the later reporting milestone, not here.

## Suggested todos (when we start)

- shared-admin-foundation (deps, validations, action result type, reusable table/form-dialog/delete components)
- categories-crud
- products-crud (with inline category create)
- payment-methods-config
- floors-tables-crud (Booking)
- coupons-promotions-crud
- users-employees-crud
- verify-admin-config (manual pass of every CRUD + validation + RBAC)
