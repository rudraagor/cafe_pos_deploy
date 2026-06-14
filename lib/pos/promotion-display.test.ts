import assert from "node:assert/strict";
import {
  buildPromotionCatalog,
  formatPromotionSchedule,
  formatPromotionSummary,
} from "@/lib/pos/promotion-display";
import type { PromotionInput } from "@/lib/pos/pricing";

const productNames = {
  p1: "Espresso",
  p2: "Croissant",
};

const categoryNames = {
  c1: "Coffee",
};

const morningRush: PromotionInput = {
  id: "1",
  name: "Morning Rush",
  scope: "order",
  productId: null,
  minQuantity: null,
  minOrderAmount: 250,
  discountType: "percent",
  value: 10,
  stackable: true,
  ruleType: "order_threshold",
  startTime: "07:00",
  endTime: "10:30",
};

const combo: PromotionInput = {
  id: "2",
  name: "Coffee & Croissant Combo",
  scope: "product",
  productId: null,
  minQuantity: null,
  minOrderAmount: null,
  discountType: "percent",
  value: 25,
  stackable: true,
  ruleType: "combo",
  ruleConfig: {
    requiredProductIds: ["p1", "p2"],
    requiredQuantity: 1,
  },
};

assert.match(
  formatPromotionSummary(morningRush, productNames, categoryNames),
  /₹250\.00/,
);
assert.match(formatPromotionSchedule(morningRush)!, /7 AM/);
assert.match(formatPromotionSummary(combo, productNames, categoryNames), /Espresso \+ Croissant/);

const catalog = buildPromotionCatalog(
  [morningRush, combo],
  productNames,
  categoryNames,
  new Date("2026-06-14T08:30:00"),
);
assert.equal(
  catalog.find((item) => item.name === "Morning Rush")?.isActiveNow,
  true,
);
assert.equal(catalog.every((item) => item.isActiveNow), true);

console.log("promotion display tests passed");
