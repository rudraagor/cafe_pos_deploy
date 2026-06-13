export type ForecastItem = {
  product: string;
  perDay: number;
  trend: string;
  suggestion: string;
};

export function buildDeterministicForecast(
  productVelocity: {
    product: string;
    perDay: number;
    quantity: number;
  }[],
  priorVelocity: { product: string; quantity: number }[] = [],
): ForecastItem[] {
  if (productVelocity.length === 0) return [];

  const priorByProduct = new Map(
    priorVelocity.map((row) => [row.product, row.quantity]),
  );

  return productVelocity.slice(0, 8).map((row) => {
    const priorQty = priorByProduct.get(row.product) ?? 0;
    let trend = "flat";
    if (row.quantity > priorQty * 1.1) trend = "up";
    else if (row.quantity < priorQty * 0.9) trend = "down";

    const suggestion =
      trend === "up"
        ? `Increase prep for ${row.product}; selling ~${row.perDay}/day.`
        : trend === "down"
          ? `Reduce prep for ${row.product}; velocity is slowing.`
          : `Maintain current prep levels for ${row.product}.`;

    return {
      product: row.product,
      perDay: row.perDay,
      trend,
      suggestion,
    };
  });
}

export function parseForecastJson(text: string): ForecastItem[] {
  const cleaned = text
    .trim()
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/i, "");

  try {
    const parsed = JSON.parse(cleaned);
    const items = Array.isArray(parsed)
      ? parsed
      : Array.isArray(parsed?.items)
        ? parsed.items
        : null;
    if (!items) return [];

    return items.slice(0, 8).map((item: Record<string, unknown>) => ({
      product: String(item.product ?? "Unknown"),
      perDay: Number(item.perDay ?? 0),
      trend: String(item.trend ?? "unknown"),
      suggestion: String(item.suggestion ?? "Review prep levels."),
    }));
  } catch {
    return [];
  }
}

export type ForecastContext = {
  productVelocity: { product: string; perDay: number; quantity: number }[];
  priorProductVelocity?: { product: string; quantity: number }[];
};

export function resolveForecast(
  aiText: string,
  context: ForecastContext,
): ForecastItem[] {
  const parsed = parseForecastJson(aiText);
  if (parsed.length > 0) return parsed;
  return buildDeterministicForecast(
    context.productVelocity,
    context.priorProductVelocity,
  );
}
