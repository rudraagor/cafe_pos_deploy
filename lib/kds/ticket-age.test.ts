import assert from "node:assert/strict";
import { ticketAgeMinutes } from "@/lib/kds/ticket-age";

const sentAt = Date.parse("2026-06-13T10:00:00.000Z");

assert.equal(ticketAgeMinutes(sentAt, sentAt), 0);
assert.equal(ticketAgeMinutes(sentAt, sentAt + 59_999), 0);
assert.equal(ticketAgeMinutes(sentAt, sentAt + 60_000), 1);
assert.equal(ticketAgeMinutes(sentAt, sentAt - 5_000), 0);

console.log("ticket age tests passed");
