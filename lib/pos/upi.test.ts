import assert from "node:assert/strict";
import { buildUpiPaymentUrl } from "@/lib/pos/upi";

const url = buildUpiPaymentUrl({
  upiId: "cafe@ybl",
  payeeName: "Parul Cafe",
  amount: 262.8,
  orderNumber: "ORD-20260613-0001",
});

assert.equal(url.startsWith("upi://pay?"), true);

const params = new URL(url).searchParams;
assert.equal(params.get("pa"), "cafe@ybl");
assert.equal(params.get("pn"), "Parul Cafe");
assert.equal(params.get("am"), "262.80");
assert.equal(params.get("cu"), "INR");
assert.equal(params.get("tn"), "ORD-20260613-0001");

console.log("upi tests passed");
