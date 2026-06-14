import { createHmac, timingSafeEqual } from "node:crypto";
import QRCode from "qrcode";
import { getAppUrl } from "@/lib/receipt-brand";

const TOKEN_VERSION = "v1";

function getSecret() {
  return (
    process.env.QR_ORDER_SECRET?.trim() ||
    process.env.AUTH_SECRET?.trim() ||
    process.env.NEXTAUTH_SECRET?.trim() ||
    "dev-qr-order-secret"
  );
}

function signTable(tableId: string) {
  return createHmac("sha256", getSecret()).update(tableId).digest("base64url");
}

export function createTableOrderToken(tableId: string) {
  return `${TOKEN_VERSION}.${tableId}.${signTable(tableId)}`;
}

export function verifyTableOrderToken(token: string) {
  const [version, tableId, signature] = token.split(".");
  if (version !== TOKEN_VERSION || !tableId || !signature) return null;

  const expected = signTable(tableId);
  const actualBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);
  if (actualBuffer.length !== expectedBuffer.length) return null;
  if (!timingSafeEqual(actualBuffer, expectedBuffer)) return null;

  return { tableId };
}

export function getTableQrOrderUrl(tableId: string) {
  return `${getAppUrl()}/qr/${createTableOrderToken(tableId)}`;
}

export async function buildTableQrDataUrl(tableId: string) {
  return QRCode.toDataURL(getTableQrOrderUrl(tableId), {
    errorCorrectionLevel: "M",
    margin: 1,
    width: 280,
  });
}
