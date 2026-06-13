import { computeOrder } from "@/lib/pos/pricing";

const result = computeOrder(
  [
    {
      productId: "p1",
      name: "Espresso",
      unitPrice: 120,
      taxRate: 5,
      qty: 3,
      isKitchenItem: true,
    },
  ],
  {
    promotions: [
      {
        id: "promo1",
        name: "Bulk Coffee",
        scope: "product",
        productId: "p1",
        minQuantity: 2,
        minOrderAmount: null,
        discountType: "percent",
        value: 10,
      },
      {
        id: "promo2",
        name: "Big order",
        scope: "order",
        productId: null,
        minQuantity: null,
        minOrderAmount: 300,
        discountType: "fixed",
        value: 50,
      },
    ],
    coupon: {
      id: "c1",
      code: "WELCOME10",
      discountType: "percent",
      value: 10,
    },
  },
);

if (result.subtotal !== 360) throw new Error(`subtotal ${result.subtotal}`);
if (result.lines[0].lineDiscount <= 0) throw new Error("line discount missing");
if (result.total <= 0) throw new Error("total invalid");
console.log("pricing ok", result);
