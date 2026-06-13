import {
  KDS_CHANGED_EVENT,
  realtimeBus,
  type KdsChangedPayload,
} from "@/lib/realtime/bus";

export function publishKdsChanged(payload: Partial<KdsChangedPayload> = {}) {
  realtimeBus.emit(KDS_CHANGED_EVENT, {
    ...payload,
    at: new Date().toISOString(),
  } satisfies KdsChangedPayload);
}
