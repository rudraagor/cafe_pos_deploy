"use client";

import { useEffect } from "react";
import { useCartStore } from "@/lib/pos/cart-store";

/** Rehydrate persisted cart state once on the client (avoids SSR snapshot loops). */
export function CartStoreHydration() {
  useEffect(() => {
    useCartStore.persist.rehydrate();
  }, []);
  return null;
}
