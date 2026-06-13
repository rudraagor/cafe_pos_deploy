export function ticketAgeMinutes(sentAtMs: number, nowMs: number) {
  return Math.max(0, Math.floor((nowMs - sentAtMs) / 60000));
}
