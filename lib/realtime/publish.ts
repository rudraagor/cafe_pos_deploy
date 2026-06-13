import {
  KDS_CHANGED_EVENT,
  REPORTS_CHANGED_EVENT,
  realtimeBus,
  type KdsChangedPayload,
  type ReportsChangedPayload,
} from "@/lib/realtime/bus";

export function publishKdsChanged(payload: Partial<KdsChangedPayload> = {}) {
  realtimeBus.emit(KDS_CHANGED_EVENT, {
    ...payload,
    at: new Date().toISOString(),
  } satisfies KdsChangedPayload);
}

export function publishReportsChanged(
  payload: Partial<ReportsChangedPayload> = {},
) {
  realtimeBus.emit(REPORTS_CHANGED_EVENT, {
    ...payload,
    at: new Date().toISOString(),
  } satisfies ReportsChangedPayload);
}
