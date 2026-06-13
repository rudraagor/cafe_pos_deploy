import QRCode from "qrcode";

type UpiPaymentInput = {
  upiId: string;
  payeeName: string;
  amount: number;
  orderNumber: string;
};

export function buildUpiPaymentUrl({
  upiId,
  payeeName,
  amount,
  orderNumber,
}: UpiPaymentInput) {
  const params = new URLSearchParams({
    pa: upiId,
    pn: payeeName,
    am: amount.toFixed(2),
    cu: "INR",
    tn: orderNumber,
  });

  return `upi://pay?${params.toString()}`;
}

export async function buildQrDataUrl(value: string) {
  return QRCode.toDataURL(value, {
    errorCorrectionLevel: "M",
    margin: 1,
    width: 240,
  });
}
