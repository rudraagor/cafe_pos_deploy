import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import {
  buildTableQrDataUrl,
  createTableOrderToken,
  verifyTableOrderToken,
} from "@/lib/pos/qr-ordering";

async function run() {
  const tableId = "107a9747-2602-4883-b126-bd782e2a707c";
  const token = createTableOrderToken(tableId);

  assert.deepEqual(verifyTableOrderToken(token), { tableId });
  assert.equal(verifyTableOrderToken(token.replace(tableId, randomUUID())), null);

  const qrDataUrl = await buildTableQrDataUrl(tableId);
  assert.match(qrDataUrl, /^data:image\/png;base64,/);

  console.log("qr ordering tests passed");
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
