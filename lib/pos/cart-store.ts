"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { PricingLineInput } from "./pricing";
import { normalizeModifiers } from "./modifiers";

export type CartItem = PricingLineInput;

export type TableCart = {
  orderId?: string;
  items: CartItem[];
  couponCode?: string;
  couponId?: string;
  couponDiscountType?: "percent" | "fixed";
  couponValue?: number;
  couponStackable?: boolean;
  customerId?: string;
  customerName?: string;
};

export const TAKEAWAY_CART_ID = "takeaway";

/** Stable fallback — must be the same reference for empty carts (Zustand SSR). */
export const EMPTY_CART: TableCart = { items: [] };

type CartState = {
  carts: Record<string, TableCart>;
  addItem: (tableId: string, item: Omit<CartItem, "qty">) => void;
  setQty: (tableId: string, cartLineId: string, qty: number) => void;
  removeItem: (tableId: string, cartLineId: string) => void;
  setCoupon: (
    tableId: string,
    coupon: {
      code: string;
      id: string;
      discountType: "percent" | "fixed";
      value: number;
      stackable?: boolean;
    } | null,
  ) => void;
  setCustomer: (
    tableId: string,
    customer: { id: string; name: string } | null,
  ) => void;
  loadDraft: (
    tableId: string,
    draft: {
      orderId: string;
      items: CartItem[];
      couponCode?: string;
      couponId?: string;
      couponDiscountType?: "percent" | "fixed";
      couponValue?: number;
      couponStackable?: boolean;
      customerId?: string;
      customerName?: string;
    },
  ) => void;
  clearTable: (tableId: string) => void;
};

function cartOrEmpty(carts: Record<string, TableCart>, tableId: string) {
  return carts[tableId] ?? EMPTY_CART;
}

function lineKey(item: Pick<CartItem, "productId" | "modifiers" | "note">) {
  const modifiers = normalizeModifiers(item.modifiers).join(",");
  const note = (item.note ?? "").trim();
  return `${item.productId}|${modifiers}|${note}`;
}

function getLineId(item: CartItem) {
  return item.cartLineId ?? lineKey(item);
}

/** Select a table cart with a stable empty fallback (safe for SSR + persist). */
export function useTableCart(tableId: string) {
  return useCartStore((s) => cartOrEmpty(s.carts, tableId));
}

export const useCartStore = create<CartState>()(
  persist(
    (set) => ({
      carts: {},

      addItem(tableId, item) {
        set((state) => {
          const cart = cartOrEmpty(state.carts, tableId);
          const nextItem = {
            ...item,
            modifiers: normalizeModifiers(item.modifiers),
            note: item.note?.trim() || undefined,
          };
          const cartLineId = lineKey(nextItem);
          const existing = cart.items.find((i) => getLineId(i) === cartLineId);
          const items = existing
            ? cart.items.map((i) =>
                getLineId(i) === cartLineId
                  ? { ...i, cartLineId, qty: i.qty + 1 }
                  : i,
              )
            : [...cart.items, { ...nextItem, cartLineId, qty: 1 }];
          return { carts: { ...state.carts, [tableId]: { ...cart, items } } };
        });
      },

      setQty(tableId, cartLineId, qty) {
        set((state) => {
          const cart = cartOrEmpty(state.carts, tableId);
          const items =
            qty <= 0
              ? cart.items.filter((i) => getLineId(i) !== cartLineId)
              : cart.items.map((i) =>
                  getLineId(i) === cartLineId ? { ...i, qty } : i,
                );
          return { carts: { ...state.carts, [tableId]: { ...cart, items } } };
        });
      },

      removeItem(tableId, cartLineId) {
        set((state) => {
          const cart = cartOrEmpty(state.carts, tableId);
          return {
            carts: {
              ...state.carts,
              [tableId]: {
                ...cart,
                items: cart.items.filter((i) => getLineId(i) !== cartLineId),
              },
            },
          };
        });
      },

      setCoupon(tableId, coupon) {
        set((state) => {
          const cart = cartOrEmpty(state.carts, tableId);
          return {
            carts: {
              ...state.carts,
              [tableId]: {
                ...cart,
                couponCode: coupon?.code,
                couponId: coupon?.id,
                couponDiscountType: coupon?.discountType,
                couponValue: coupon?.value,
                couponStackable: coupon?.stackable,
              },
            },
          };
        });
      },

      setCustomer(tableId, customer) {
        set((state) => {
          const cart = cartOrEmpty(state.carts, tableId);
          return {
            carts: {
              ...state.carts,
              [tableId]: {
                ...cart,
                customerId: customer?.id,
                customerName: customer?.name,
              },
            },
          };
        });
      },

      loadDraft(tableId, draft) {
        set((state) => ({
          carts: {
            ...state.carts,
            [tableId]: {
              orderId: draft.orderId,
              items: draft.items.map((item) => ({
                ...item,
                modifiers: normalizeModifiers(item.modifiers),
                note: item.note?.trim() || undefined,
                cartLineId: item.cartLineId ?? lineKey(item),
              })),
              couponCode: draft.couponCode,
              couponId: draft.couponId,
              couponDiscountType: draft.couponDiscountType,
              couponValue: draft.couponValue,
              couponStackable: draft.couponStackable,
              customerId: draft.customerId,
              customerName: draft.customerName,
            },
          },
        }));
      },

      clearTable(tableId) {
        set((state) => {
          const next = { ...state.carts };
          delete next[tableId];
          return { carts: next };
        });
      },
    }),
    {
      name: "cafe-pos-carts",
      skipHydration: true,
    },
  ),
);
