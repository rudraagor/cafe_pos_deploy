export function getReceiptBrand() {
  return {
    name: process.env.RECEIPT_BRAND_NAME?.trim() || "Parul Cafe",
    address:
      process.env.RECEIPT_BRAND_ADDRESS?.trim() || "Vadodara, Gujarat",
    footer:
      process.env.RECEIPT_BRAND_FOOTER?.trim() ||
      "Thank you for dining with us.",
  };
}

export function getAppUrl() {
  return (
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ||
    process.env.AUTH_URL?.replace(/\/$/, "") ||
    "http://localhost:3000"
  );
}
