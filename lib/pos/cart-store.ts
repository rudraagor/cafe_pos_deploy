"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { PricingLineInput } from "./pricing";

export type CartItem = PricingLineInput;

export type TableCart = {
  orderId?: string;
  items: CartItem[];
  couponCode?: string;
  couponId?: string;
  couponDiscountType?: "percent" | "fixed";
  couponValue?: number;
  customerId?: string;
  customerName?: string;
};

/** Stable fallback — must be the same reference for empty carts (Zustand SSR). */
export const EMPTY_CART: TableCart = { items: [] };

type CartState = {
  carts: Record<string, TableCart>;
  addItem: (tableId: string, item: Omit<CartItem, "qty">) => void;
  setQty: (tableId: string, productId: string, qty: number) => void;
  removeItem: (tableId: string, productId: string) => void;
  setCoupon: (
    tableId: string,
    coupon: {
      code: string;
      id: string;
      discountType: "percent" | "fixed";
      value: number;
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
      customerId?: string;
      customerName?: string;
    },
  ) => void;
  clearTable: (tableId: string) => void;
};

function cartOrEmpty(carts: Record<string, TableCart>, tableId: string) {
  return carts[tableId] ?? EMPTY_CART;
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
          const existing = cart.items.find((i) => i.productId === item.productId);
          const items = existing
            ? cart.items.map((i) =>
                i.productId === item.productId
                  ? { ...i, qty: i.qty + 1 }
                  : i,
              )
            : [...cart.items, { ...item, qty: 1 }];
          return { carts: { ...state.carts, [tableId]: { ...cart, items } } };
        });
      },

      setQty(tableId, productId, qty) {
        set((state) => {
          const cart = cartOrEmpty(state.carts, tableId);
          const items =
            qty <= 0
              ? cart.items.filter((i) => i.productId !== productId)
              : cart.items.map((i) =>
                  i.productId === productId ? { ...i, qty } : i,
                );
          return { carts: { ...state.carts, [tableId]: { ...cart, items } } };
        });
      },

      removeItem(tableId, productId) {
        set((state) => {
          const cart = cartOrEmpty(state.carts, tableId);
          return {
            carts: {
              ...state.carts,
              [tableId]: {
                ...cart,
                items: cart.items.filter((i) => i.productId !== productId),
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
              items: draft.items,
              couponCode: draft.couponCode,
              couponId: draft.couponId,
              couponDiscountType: draft.couponDiscountType,
              couponValue: draft.couponValue,
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
