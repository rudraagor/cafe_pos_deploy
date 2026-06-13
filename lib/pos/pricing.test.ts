import assert from "node:assert/strict";
import { computeOrder } from "@/lib/pos/pricing";

function espressoLine(qty: number) {
  return {
    productId: "p1",
    name: "Espresso",
    unitPrice: 120,
    taxRate: 5,
    qty,
    isKitchenItem: true,
    categoryColor: "#7c3aed",
  };
}

const stackedDiscounts = computeOrder([espressoLine(3)], {
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
});

assert.equal(stackedDiscounts.subtotal, 360);
assert.equal(stackedDiscounts.lines[0].lineDiscount, 36);
assert.equal(stackedDiscounts.lines[0].lineTax, 16.2);
assert.equal(stackedDiscounts.discountTotal, 113.4);
assert.equal(stackedDiscounts.total, 262.8);
assert.equal(stackedDiscounts.orderDiscounts.length, 2);
assert.equal(stackedDiscounts.appliedCoupon?.code, "WELCOME10");
assert.equal(stackedDiscounts.lines[0].isKitchenItem, true);
assert.equal(stackedDiscounts.lines[0].categoryColor, "#7c3aed");

const cappedDiscount = computeOrder(
  [
    {
      productId: "p2",
      name: "Brownie",
      unitPrice: 100,
      taxRate: 0,
      qty: 1,
      isKitchenItem: true,
    },
  ],
  {
    promotions: [
      {
        id: "promo3",
        name: "Free brownie",
        scope: "product",
        productId: "p2",
        minQuantity: 1,
        minOrderAmount: null,
        discountType: "fixed",
        value: 500,
      },
    ],
  },
);

assert.equal(cappedDiscount.lines[0].lineDiscount, 100);
assert.equal(cappedDiscount.discountTotal, 100);
assert.equal(cappedDiscount.total, 0);

const unmetPromotions = computeOrder([espressoLine(1)], {
  promotions: [
    {
      id: "promo4",
      name: "Bulk Coffee",
      scope: "product",
      productId: "p1",
      minQuantity: 2,
      minOrderAmount: null,
      discountType: "percent",
      value: 10,
    },
    {
      id: "promo5",
      name: "Large order",
      scope: "order",
      productId: null,
      minQuantity: null,
      minOrderAmount: 500,
      discountType: "fixed",
      value: 50,
    },
  ],
});

assert.equal(unmetPromotions.discountTotal, 0);
assert.equal(unmetPromotions.orderDiscounts.length, 0);
assert.equal(unmetPromotions.total, 126);

console.log("pricing tests passed");
