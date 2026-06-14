import { formatDateInput, type ChartBucket } from "@/lib/reports/range";

export type TrendPoint = {
  label: string;
  revenue: number;
  orders: number;
};

function bucketSize(bucket: ChartBucket) {
  if (bucket === "7d") return 7;
  if (bucket === "15d") return 15;
  if (bucket === "30d") return 30;
  return 1;
}

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function formatBucketLabel(start: Date, endExclusive: Date, bucket: ChartBucket) {
  const endInclusive = addDays(endExclusive, -1);
  if (bucket === "1d") return formatDateInput(start);
  if (formatDateInput(start) === formatDateInput(endInclusive)) {
    return formatDateInput(start);
  }
  return `${formatDateInput(start)} – ${formatDateInput(endInclusive)}`;
}

export function aggregateTrendByBucket(
  daily: TrendPoint[],
  bucket: ChartBucket,
  rangeStart: Date,
  rangeEnd: Date,
): TrendPoint[] {
  const size = bucketSize(bucket);
  const byDay = new Map(daily.map((row) => [row.label, row]));
  const result: TrendPoint[] = [];
  let cursor = startOfDay(rangeStart);
  const endExclusive = startOfDay(rangeEnd);

  while (cursor < endExclusive) {
    const bucketEnd = addDays(cursor, size);
    const bucketEndClamped =
      bucketEnd.getTime() > endExclusive.getTime() ? endExclusive : bucketEnd;
    let revenue = 0;
    let orders = 0;

    for (let day = new Date(cursor); day < bucketEndClamped; day = addDays(day, 1)) {
      const row = byDay.get(formatDateInput(day));
      if (row) {
        revenue += row.revenue;
        orders += row.orders;
      }
    }

    result.push({
      label: formatBucketLabel(cursor, bucketEndClamped, bucket),
      revenue,
      orders,
    });
    cursor = bucketEndClamped.getTime() === bucketEnd.getTime() ? bucketEnd : endExclusive;
  }

  return result;
}
