# Milestone 5 — Kitchen Display System + Realtime

Goal: the headline standout feature. When a cashier sends an order to the kitchen, it appears on a
shared Kitchen Display screen **in real time** (no refresh). Cooks move tickets through
`to_cook → preparing → completed`, per-item check-off works, and the POS/Tables views reflect kitchen
progress live. This closes spec section 4 and the realtime infrastructure the whole app benefits from.

Not started yet — this is the plan. Scope is full (nothing trimmed).

## Why this is the standout

The KDS is the most visible "wow" in a live demo: send an order on one screen, watch it pop up on
another instantly. The realtime bus we build here is reused later for the live admin dashboard
(M6 reporting) and the Tables view occupancy.

## What already exists (no migration needed)

- `kdsStage` enum (`to_cook`, `preparing`, `completed`) on `orders`.
- `orderItems.itemCompleted` boolean for per-item check-off.
- `orders.sentToKitchenAt` timestamp (for ticket age / overdue coloring).
- `/kds` route is **public** (allowlisted in `proxy.ts`) with a dark themed layout + a stage legend
  (To Cook / Preparing / Overdue) already stubbed in `app/kds/layout.tsx`.
- `sendToKitchen` already sets `kdsStage` and preserves it on edit.

So M5 is feature work + a realtime transport — no schema changes expected.

## Realtime transport decision

Use **Server-Sent Events (SSE)** backed by an **in-process EventEmitter** (the plan from M1). SSE is
one-directional (server → screen), which is exactly the KDS need, works over plain HTTP, needs no
extra infra, and degrades gracefully. Mutations still go through normal server actions; after a
successful mutation we `emit` an event that all connected SSE clients receive.

> Single-process caveat: an in-memory emitter only fans out within one Node process. That's perfect
> for a hackathon/demo (single server). If we ever deploy multi-instance, swap the emitter for
> Postgres `LISTEN/NOTIFY` or Redis pub/sub behind the same interface. Build the interface so this
> swap is a one-file change.

## Shared foundation (build first)

1. **Event bus:** `lib/realtime/bus.ts` — a module-level `EventEmitter` (guarded on `globalThis` like
   the db pool so HMR doesn't create duplicates). Typed events: `kds:changed` (payload: minimal
   `{ orderId }` or just a "dirty" ping). Keep payloads tiny; clients refetch authoritative data.
2. **Publisher:** `lib/realtime/publish.ts` — `publishKdsChanged()` helper called from every action
   that affects the kitchen (`sendToKitchen`, stage changes, item toggles, payment that closes a
   ticket, delete draft).
3. **SSE route:** `app/api/kds/stream/route.ts` — a `GET` route handler returning a
   `ReadableStream` with `text/event-stream` headers; subscribes to the bus, writes an event on each
   ping, sends periodic `:keep-alive` comments, and cleans up the listener on `req.signal` abort.
   Set `export const dynamic = "force-dynamic"` and runtime `nodejs`.
4. **Client hook:** `lib/realtime/use-kds-stream.ts` — `EventSource` wrapper that calls
   `router.refresh()` (or a passed callback) on each event, with auto-reconnect.

## Build order

### 1. KDS queries — `lib/pos/queries.ts`
- `getKitchenTickets()` — all orders with `kdsStage in (to_cook, preparing)` (exclude `completed`,
  `paid`, `cancelled` unless we want a "recently completed" column), with table, items
  (kitchen items only — `isKitchenItem = true`), `sentToKitchenAt`. Ordered oldest-first
  (FIFO — the kitchen works the oldest ticket first).
- Decide: do paid orders still show until completed? Recommended: a ticket leaves the board when
  `kdsStage = completed`, independent of payment (kitchen doesn't care about money).

### 2. KDS server actions — `app/kds/actions.ts`
- `advanceTicket(orderId)` — `to_cook → preparing → completed`; on `completed`, optionally clear the
  table indicator. `publishKdsChanged()` after.
- `toggleItemCompleted(orderItemId)` — flips `itemCompleted`; if all kitchen items complete, optionally
  auto-advance to `completed`. `publishKdsChanged()`.
- `recallTicket(orderId)` — move `completed → preparing` (cook bump-back). `publishKdsChanged()`.
- These are **public-ish**: `/kds` is unauthenticated by design (shared screen). Guard by obscurity
  for the demo, or add a lightweight shared KDS PIN. Note this tradeoff in the doc/demo script.

### 3. KDS board UI — `app/kds/page.tsx` + components
- `components/kds/ticket-card.tsx` — a ticket: order number, table, age timer (turns amber > N min,
  red when overdue), list of kitchen items with tap-to-check, and a primary button that advances the
  stage (Start → Mark Ready). Big touch targets, high contrast (dark theme already set).
- `components/kds/kds-board.tsx` (client) — three columns **To Cook / Preparing / Completed (recent)**;
  subscribes via `useKdsStream` and re-renders on events. Server component fetches initial tickets;
  client refreshes on SSE ping.
- Age timer ticks client-side off `sentToKitchenAt` (no server polling needed for the clock).

### 4. Wire realtime into existing surfaces
- Add `publishKdsChanged()` to `sendToKitchen`, `takePayment` (if it should drop a ticket),
  `deleteDraftOrder`.
- POS **Tables** view + current-table indicator: optionally subscribe to the same stream so occupancy
  reflects kitchen completion live (nice-to-have; can stay on `revalidatePath`).

### 5. Polish / standout
- **New-ticket sound + flash** when a ticket arrives (the demo crowd-pleaser).
- **Age coloring**: green < 5 min, amber 5–10, red > 10 (thresholds configurable).
- **Bump animation** when a ticket advances/leaves the board.
- Ticket count badges per column; "all caught up" empty state.
- Fullscreen-friendly layout (kitchen TV).

## Open questions
- **KDS auth:** fully public URL vs shared PIN vs require login? (Spec implies a shared screen.)
  Recommend: public for demo, mention PIN as a production note.
- **Completed column:** show recently-completed tickets (last N) or remove immediately? Recommend show
  last ~10 min so cooks can recall.
- **Multi-station routing** (grill vs barista) — out of scope unless time permits; `categoryId` could
  drive station filters later.

## Team assets needed (TEAM-TASKS)
- A second screen / browser window for the live demo (KDS on one, POS on the other).
- Optional notification sound asset.
- Demo script: open session → build order → Send to Kitchen → watch KDS → advance → pay → receipt.
