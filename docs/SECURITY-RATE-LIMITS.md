# Security & Rate Limits

The app uses an in-memory fixed-window limiter in `lib/security/rate-limit.ts`.
This matches the current single-instance deployment model used by the SSE event
bus. If the app is scaled to multiple replicas, move these counters to Redis,
Upstash, or Postgres-backed buckets.

| Surface                     | Limit                                        | Key                    | Why                                                             |
| --------------------------- | -------------------------------------------- | ---------------------- | --------------------------------------------------------------- |
| `POST /api/auth/*`          | 20 / 15 min                                  | IP                     | Caps direct auth endpoint abuse.                                |
| Login Server Action         | 10 / 10 min by IP, 5 / 10 min by email       | IP + email             | Slows credential stuffing while allowing normal retries.        |
| `GET /api/kds/stream`       | 30 / min                                     | IP                     | Prevents many long-lived SSE connections from one client.       |
| KDS unlock                  | 5 / 10 min                                   | IP                     | Protects the public kitchen PIN.                                |
| KDS mutations               | 120 / min                                    | IP after unlock cookie | Allows rapid kitchen tapping, blocks scripted mutation floods.  |
| `GET /api/reports/stream`   | 60 / min                                     | admin user             | Protects authenticated SSE fanout.                              |
| Report exports CSV/XLSX/PDF | 20 / min per format                          | admin user             | Exports can be CPU/IO heavy on bulk demo data.                  |
| AI briefing / forecast      | 6 / min each                                 | admin user             | Controls OpenAI cost and accidental repeated generation.        |
| AI question                 | 10 / min                                     | admin user             | Allows interactive use without unbounded model calls.           |
| AI cache reset              | 20 / min                                     | admin user             | Prevents cache-bypass loops.                                    |
| Lunch rush simulator        | 12 bursts / min                              | admin user             | Demo runs at 6/min; limit allows headroom but blocks hammering. |
| Coupon validation           | 60 / min                                     | POS user               | Slows coupon-code guessing without blocking cashiers.           |
| Receipt resend              | 5 / 10 min                                   | POS user + order       | Prevents customer email spam.                                   |
| `POST /api/qr-orders`       | 30 / 10 min global, 10 / 10 min per table    | IP, table token + IP   | Public endpoint: limits spam while allowing a real table to retry. |
| QR order approve/reject     | 120 / min                                    | POS user               | Supports rapid waiter review without letting the action flood KDS. |
| Marketing coupon email      | 10 / 10 min by admin, 3 / 10 min by customer | admin + customer       | Prevents bulk/personalized email spam.                          |
| Reservation creation        | 20 / 10 min                                  | user                   | Caps confirmation-email bursts.                                 |
