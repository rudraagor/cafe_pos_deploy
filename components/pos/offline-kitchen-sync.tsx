"use client";

import { CloudOff, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
import { toast } from "sonner";
import { sendToKitchen } from "@/app/(dashboard)/pos/actions";
import { useCartStore } from "@/lib/pos/cart-store";

export function OfflineKitchenSync() {
  const router = useRouter();
  const pending = useCartStore((state) => state.pendingKitchenOrders);
  const clearTable = useCartStore((state) => state.clearTable);
  const markSynced = useCartStore((state) => state.markKitchenOrderSynced);
  const markFailed = useCartStore((state) => state.markKitchenOrderFailed);
  const syncingRef = useRef(false);

  useEffect(() => {
    async function flushQueue() {
      if (syncingRef.current || !navigator.onLine) return;
      const queue = useCartStore.getState().pendingKitchenOrders;
      if (queue.length === 0) return;

      syncingRef.current = true;
      try {
        for (const order of queue) {
          const result = await sendToKitchen(order.payload);
          if (result.ok) {
            clearTable(order.cartId);
            markSynced(order.id);
            toast.success("Offline order synced to kitchen.");
            router.refresh();
          } else {
            markFailed(order.id, result.error);
            toast.error(result.error);
          }
        }
      } finally {
        syncingRef.current = false;
      }
    }

    flushQueue();
    window.addEventListener("online", flushQueue);
    return () => window.removeEventListener("online", flushQueue);
  }, [clearTable, markFailed, markSynced, router, pending.length]);

  if (pending.length === 0) return null;

  return (
    <div className="bg-card fixed right-4 bottom-4 z-50 flex items-center gap-2 rounded-lg border px-3 py-2 text-sm shadow-lg">
      {typeof navigator !== "undefined" && navigator.onLine ? (
        <Loader2 className="size-4 animate-spin" />
      ) : (
        <CloudOff className="size-4" />
      )}
      <span>{pending.length} kitchen sync pending</span>
    </div>
  );
}
