import { EventEmitter } from "node:events";

export const KDS_CHANGED_EVENT = "kds:changed";

export type KdsChangedPayload = {
  orderId?: string;
  at: string;
};

const globalForRealtime = globalThis as typeof globalThis & {
  __cafeRealtimeBus?: EventEmitter;
};

export const realtimeBus =
  globalForRealtime.__cafeRealtimeBus ?? new EventEmitter();

if (!globalForRealtime.__cafeRealtimeBus) {
  realtimeBus.setMaxListeners(100);
  globalForRealtime.__cafeRealtimeBus = realtimeBus;
}
