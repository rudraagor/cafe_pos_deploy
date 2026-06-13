# Milestone 6 — Reporting, Live Dashboard & AI Insights

Goal: turn the data the POS has been collecting into decisions. Admins get a **live sales dashboard**
(KPIs + charts), proper **session/Z-reports**, and the headline AI features: an **AI daily briefing**,
**AI inventory / restock forecasting**, and **ask-a-question** over the cafe's own data — powered by the
**OpenAI SDK** (the user has an API key). This is the final "wow" milestone.

Not started yet — this is the plan. Scope is full (nothing trimmed).

## Outcome / definition of done

- `/admin/reports` shows a dashboard: KPI cards (revenue, orders, avg order value, discounts given),
  charts (revenue over time, top products, sales by category, payment-method split, sales by hour),
  with a **date-range filter** and a **live** mode (updates as new orders are paid).
- **Session / Z-report**: per-session summary (opening float, orders, gross, discounts, tax, net,
  payment breakdown, closing amount) — printable, matches what the cashier saw at close.
- **AI Daily Briefing**: a plain-English summary of the day ("Revenue ₹X across N orders, up/down vs
  yesterday; best seller is …; quietest hour is …; 2 suggestions").
- **AI Inventory Forecast**: per-product sales velocity → restock suggestions ("Cappuccino selling
  ~18/day, trending up — prep more milk").
- **Ask-a-question**: admin types "what were my top 3 items last week?" → AI answers from aggregated data.
- All AI calls run server-side; **only aggregated, non-PII data** is sent to OpenAI.

## No schema migration required (mostly)

Reporting reads existing tables (`orders`, `orderItems`, `payments`, `posSessions`, `products`,
`categories`). Optional, only if we want to persist AI outputs:
- `ai_reports` table (`id`, `kind`, `rangeStart`, `rangeEnd`, `payload jsonb`, `createdAt`) to cache
  briefings so we don't re-spend tokens on every page load. Recommended but optional.

## Shared foundation (build first)

1. **Dependencies:** add `openai` (official SDK) and a chart lib — `recharts` (React-friendly, SSR-safe
   with a client wrapper). Add `OPENAI_API_KEY` and `OPENAI_MODEL` (default e.g. `gpt-4o-mini` for
   cost) to `.env.local` / `.env.example`.
   > During implementation, check current OpenAI SDK usage via the context7 docs (Responses API vs
   > chat completions, streaming helpers) rather than relying on memory — the SDK surface moves.
2. **Aggregation queries:** `lib/reports/queries.ts` — pure SQL/Drizzle aggregations, parameterized by
   date range. Keep them returning small, typed shapes (numbers + labels), never raw orders:
   - `getSalesSummary(range)` — revenue, order count, AOV, total discount, total tax.
   - `getRevenueByDay(range)`, `getSalesByHour(range)`.
   - `getTopProducts(range, limit)`, `getSalesByCategory(range)`.
   - `getPaymentMix(range)` — totals grouped by `payments.method`.
   - `getSessionReport(sessionId)` — the Z-report shape.
   - `getProductVelocity(range)` — qty/day per product for forecasting.
3. **Date-range helper:** `lib/reports/range.ts` — presets (Today, Yesterday, Last 7d, This month,
   Custom) → `{ start, end }`. Default Today.
4. **AI guardrail helper:** `lib/ai/context.ts` — builds a compact, **anonymized** JSON snapshot from the
   aggregation queries (product names + numbers only; no customer names/emails/phones) to feed the model.

## Build order

### 1. Aggregation queries + KPIs (no AI yet)
- Implement `lib/reports/queries.ts`. Verify totals reconcile with the orders list (paid orders only
  for revenue; decide whether drafts count — recommended: revenue = paid only).
- Unit-sanity a couple of aggregates against seeded data (like the pricing test pattern).

### 2. Dashboard UI — `/admin/reports`
- Server component fetches aggregates for the selected range; client components render:
  - `components/reports/kpi-cards.tsx`
  - `components/reports/revenue-chart.tsx` (recharts line/area) — client-only wrapper.
  - `components/reports/top-products.tsx`, `payment-mix.tsx`, `sales-by-hour.tsx`.
  - `components/reports/range-picker.tsx` (URL searchParam-driven so it's shareable + server-fetched).
- Admin-only (already enforced by `proxy.ts` + `requireRole("admin")`).

### 3. Live mode (reuse M5 SSE)
- On a successful `takePayment`, the existing `publishKdsChanged` bus can carry a second event type
  (`reports:changed`) or a generic `data:changed`. Add a `useReportsStream` hook that `router.refresh()`
  the dashboard so KPIs update live as orders are paid. Keep it opt-in (a "Live" toggle).

### 4. Session / Z-report
- `/admin/reports/sessions` list + `/admin/reports/sessions/[id]` detail using `getSessionReport`.
- Printable (reuse the print CSS approach from receipts). Link from the cashier close-session summary.

### 5. AI features — `lib/ai/` + server actions
- `lib/ai/client.ts` — a thin `getOpenAI()` that throws a clear error if `OPENAI_API_KEY` is unset
  (and a UI fallback: "Add OPENAI_API_KEY to enable AI insights").
- `app/(admin)/admin/reports/ai-actions.ts` (`"use server"`, `requireRole("admin")`):
  - `generateDailyBriefing(range)` — build anonymized context → call OpenAI with a tight system prompt
    ("You are a cafe analyst. Be concise, use the numbers, give 2 actions.") → return text (stream if
    easy). Cache to `ai_reports` if we add the table.
  - `generateInventoryForecast(range)` — feed `getProductVelocity` → structured suggestions
    (ask the model for JSON: `[{product, perDay, trend, suggestion}]`) → render as a table.
  - `askQuestion(question, range)` — pass the anonymized snapshot + the question; return a grounded
    answer. Reject/deflect questions that would need data we didn't provide (avoid hallucination).
- **Cost/safety:** default to a small model, cap `max_tokens`, send only aggregates, and debounce the
  briefing (cache per day). Never send customer PII or raw rows.

### 6. UI for AI
- `components/reports/ai-briefing.tsx` — "Generate today's briefing" button → streamed text card.
- `components/reports/ai-forecast.tsx` — forecast table with trend arrows.
- `components/reports/ai-ask.tsx` — input box + answer area (chat-lite, single-turn is fine).

## Standout / polish
- Streaming the AI briefing token-by-token (feels alive in a demo).
- Trend arrows + "vs previous period" deltas on KPI cards.
- Anomaly callout ("Sales 40% below usual for this hour").
- Export dashboard range to CSV.

## Open questions
- **Model choice:** `gpt-4o-mini` (cheap, fast, fine for summaries) vs a larger model for the ask
  feature. Recommend mini for the demo.
- **Revenue definition:** paid orders only (recommended) vs include drafts.
- **Persist AI reports?** Add `ai_reports` cache table, or regenerate each time (simpler, costs tokens).
- **Multi-day seed data:** the AI demo is far stronger with a few days of varied sales — needs seed
  data (team asset).

## Team assets needed (TEAM-TASKS)
- **Multi-day demo sales data** so charts and forecasts look real (seed script extension or scripted
  order generation).
- A short list of demo questions for the ask-a-question feature.
- Confirmation of the OpenAI key + acceptable spend for the demo.
