"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import type { ActionResult } from "@/lib/action-result";
import { getOpenAI } from "@/lib/ai/client";
import { buildReportAiContext } from "@/lib/ai/context";
import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { aiReports } from "@/lib/db/schema";
import { parseReportRange, type ReportSearchParams } from "@/lib/reports/range";

type AiActionResult<T = string> = ActionResult & {
  data?: T;
  cached?: boolean;
};

type ForecastItem = {
  product: string;
  perDay: number;
  trend: string;
  suggestion: string;
};

export async function generateDailyBriefing(
  params: ReportSearchParams,
): Promise<AiActionResult> {
  await requireRole("admin");
  const range = parseReportRange(params);
  const cached = await getCachedAiReport<string>("daily_briefing", range);
  if (cached) return { ok: true, data: cached, cached: true };

  const ai = getOpenAI();
  if (!ai.ok) return { ok: false, error: ai.error };

  const context = await buildReportAiContext(range);
  const response = await ai.client.responses.create({
    model: ai.model,
    max_output_tokens: 500,
    input: [
      {
        role: "system",
        content:
          "You are a concise cafe analyst. Use only the provided aggregate data. Write a short daily briefing with revenue, paid orders, best seller, quiet period if visible, and exactly two practical actions. Do not invent missing data.",
      },
      {
        role: "user",
        content: JSON.stringify(context),
      },
    ],
  });

  const text = response.output_text.trim();
  await cacheAiReport("daily_briefing", range, text);
  revalidatePath("/admin/reports");
  return { ok: true, data: text };
}

export async function generateInventoryForecast(
  params: ReportSearchParams,
): Promise<AiActionResult<ForecastItem[]>> {
  await requireRole("admin");
  const range = parseReportRange(params);
  const cached = await getCachedAiReport<ForecastItem[]>(
    "inventory_forecast",
    range,
  );
  if (cached) return { ok: true, data: cached, cached: true };

  const ai = getOpenAI();
  if (!ai.ok) return { ok: false, error: ai.error };

  const context = await buildReportAiContext(range);
  const response = await ai.client.responses.create({
    model: ai.model,
    max_output_tokens: 700,
    input: [
      {
        role: "system",
        content:
          "You forecast cafe prep needs from aggregate product velocity. Return only valid JSON: an array of up to 8 objects with product, perDay, trend, suggestion. Use trend values up, down, flat, or unknown. Do not include prose.",
      },
      {
        role: "user",
        content: JSON.stringify({
          range: context.range,
          productVelocity: context.productVelocity,
          topProducts: context.topProducts,
        }),
      },
    ],
  });

  const parsed = parseForecast(response.output_text);
  await cacheAiReport("inventory_forecast", range, parsed);
  revalidatePath("/admin/reports");
  return { ok: true, data: parsed };
}

export async function askReportQuestion(
  params: ReportSearchParams,
  question: string,
): Promise<AiActionResult> {
  await requireRole("admin");
  const cleaned = question.trim();
  if (cleaned.length < 3) {
    return { ok: false, error: "Ask a reporting question first." };
  }

  const ai = getOpenAI();
  if (!ai.ok) return { ok: false, error: ai.error };

  const context = await buildReportAiContext(parseReportRange(params));
  const response = await ai.client.responses.create({
    model: ai.model,
    max_output_tokens: 500,
    input: [
      {
        role: "system",
        content:
          "Answer questions about this cafe using only the provided aggregate data. If the data cannot answer the question, say what is missing instead of guessing. Never mention customer PII.",
      },
      {
        role: "user",
        content: JSON.stringify({ question: cleaned, context }),
      },
    ],
  });

  return { ok: true, data: response.output_text.trim() };
}

async function getCachedAiReport<T>(kind: string, range: ReturnType<typeof parseReportRange>) {
  const row = await db.query.aiReports.findFirst({
    where: and(
      eq(aiReports.kind, kind),
      eq(aiReports.rangeStart, range.start),
      eq(aiReports.rangeEnd, range.end),
    ),
    orderBy: (report, { desc }) => [desc(report.createdAt)],
  });

  return row?.payload as T | undefined;
}

async function cacheAiReport(
  kind: string,
  range: ReturnType<typeof parseReportRange>,
  payload: unknown,
) {
  await db.insert(aiReports).values({
    kind,
    rangeStart: range.start,
    rangeEnd: range.end,
    payload,
  });
}

function parseForecast(text: string): ForecastItem[] {
  try {
    const parsed = JSON.parse(text);
    if (!Array.isArray(parsed)) return [];
    return parsed.slice(0, 8).map((item) => ({
      product: String(item.product ?? "Unknown"),
      perDay: Number(item.perDay ?? 0),
      trend: String(item.trend ?? "unknown"),
      suggestion: String(item.suggestion ?? "Review prep levels."),
    }));
  } catch {
    return [];
  }
}
