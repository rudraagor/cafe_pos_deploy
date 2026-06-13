"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import type { ActionResult } from "@/lib/action-result";
import { getOpenAI } from "@/lib/ai/client";
import { buildReportAiContext } from "@/lib/ai/context";
import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { aiReports } from "@/lib/db/schema";
import {
  parseReportFilters,
  type ReportFilters,
  type ReportSearchParams,
} from "@/lib/reports/range";

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

type AiMessage = {
  role: "system" | "user";
  content: string;
};

type AiTextResult = { ok: true; data: string } | { ok: false; error: string };

export async function generateDailyBriefing(
  params: ReportSearchParams,
): Promise<AiActionResult> {
  await requireRole("admin");
  const filters = parseReportFilters(params);
  const cached = await getCachedAiReport<string>("daily_briefing", filters);
  if (cached) return { ok: true, data: cached, cached: true };

  const ai = getOpenAI();
  if (!ai.ok) return { ok: false, error: ai.error };

  const context = await buildReportAiContext(filters);
  const response = await createResponse(ai, [
    {
      role: "system",
      content:
        "You are a concise cafe analyst. Use only the provided filtered aggregate data. Write a short daily briefing with revenue, paid orders, best seller, quiet period if visible, and exactly two practical actions. Mention that the answer is scoped to the selected filters. Do not invent missing data.",
    },
    {
      role: "user",
      content: JSON.stringify(context),
    },
  ], 500);
  if (!response.ok) return response;

  const text = response.data.trim();
  await cacheAiReport("daily_briefing", filters, text);
  revalidatePath("/admin/reports");
  return { ok: true, data: text };
}

export async function generateInventoryForecast(
  params: ReportSearchParams,
): Promise<AiActionResult<ForecastItem[]>> {
  await requireRole("admin");
  const filters = parseReportFilters(params);
  const cached = await getCachedAiReport<ForecastItem[]>(
    "inventory_forecast",
    filters,
  );
  if (cached) return { ok: true, data: cached, cached: true };

  const ai = getOpenAI();
  if (!ai.ok) return { ok: false, error: ai.error };

  const context = await buildReportAiContext(filters);
  const response = await createResponse(ai, [
    {
      role: "system",
      content:
        "You forecast cafe prep needs from filtered aggregate product velocity. Return only valid JSON: an array of up to 8 objects with product, perDay, trend, suggestion. Use trend values up, down, flat, or unknown. Do not include prose.",
    },
    {
      role: "user",
      content: JSON.stringify({
        range: context.range,
        filters: context.filters,
        productVelocity: context.productVelocity,
        topProducts: context.topProducts,
      }),
    },
  ], 700);
  if (!response.ok) return response;

  const parsed = parseForecast(response.data);
  await cacheAiReport("inventory_forecast", filters, parsed);
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

  const context = await buildReportAiContext(parseReportFilters(params));
  const response = await createResponse(ai, [
    {
      role: "system",
      content:
        "Answer questions about this cafe using only the provided filtered aggregate data. If the data cannot answer the question, say what is missing instead of guessing. Mention the selected filters when relevant. Never mention customer PII.",
    },
    {
      role: "user",
      content: JSON.stringify({ question: cleaned, context }),
    },
  ], 500);
  if (!response.ok) return response;

  return { ok: true, data: response.data.trim() };
}

async function getCachedAiReport<T>(kind: string, filters: ReportFilters) {
  const row = await db.query.aiReports.findFirst({
    where: and(
      eq(aiReports.kind, cacheKind(kind, filters)),
      eq(aiReports.rangeStart, filters.start),
      eq(aiReports.rangeEnd, filters.end),
    ),
    orderBy: (report, { desc }) => [desc(report.createdAt)],
  });

  return row?.payload as T | undefined;
}

async function cacheAiReport(
  kind: string,
  filters: ReportFilters,
  payload: unknown,
) {
  await db.insert(aiReports).values({
    kind: cacheKind(kind, filters),
    rangeStart: filters.start,
    rangeEnd: filters.end,
    payload,
  });
}

function cacheKind(kind: string, filters: ReportFilters) {
  return [
    kind,
    `employee:${filters.employeeId ?? "all"}`,
    `session:${filters.sessionId ?? "all"}`,
    `product:${filters.productId ?? "all"}`,
  ].join("|");
}

async function createResponse(
  ai: Extract<ReturnType<typeof getOpenAI>, { ok: true }>,
  input: AiMessage[],
  maxOutputTokens: number,
): Promise<AiTextResult> {
  try {
    const response = await ai.client.responses.create({
      model: ai.model,
      max_output_tokens: maxOutputTokens,
      input,
    });
    return { ok: true, data: response.output_text };
  } catch (error) {
    console.error("AI report generation failed", error);
    return { ok: false, error: "AI insights could not be generated right now." };
  }
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
