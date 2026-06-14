"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import type { ActionResult } from "@/lib/action-result";
import { getOpenAI } from "@/lib/ai/client";
import {
  buildReportAiContext,
  AI_CURRENCY_INSTRUCTION,
} from "@/lib/ai/context";
import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { aiReports } from "@/lib/db/schema";
import {
  buildDeterministicForecast,
  parseForecastJson,
  type ForecastItem,
} from "@/lib/reports/forecast-fallback";
import { getProductVelocity } from "@/lib/reports/queries";
import {
  parseReportFilters,
  type ReportFilters,
  type ReportSearchParams,
} from "@/lib/reports/range";
import { checkRateLimit } from "@/lib/security/rate-limit";

type AiActionOptions = { skipCache?: boolean };

type AiActionResult<T = string> = ActionResult & {
  data?: T;
  cached?: boolean;
};

type AiMessage = {
  role: "system" | "user";
  content: string;
};

type AiTextResult = { ok: true; data: string } | { ok: false; error: string };

export async function generateDailyBriefing(
  params: ReportSearchParams,
  options: AiActionOptions = {},
): Promise<AiActionResult> {
  const user = await requireRole("admin");
  const limit = checkRateLimit({
    scope: "ai:daily_briefing",
    identifier: user.id,
    limit: 6,
    windowMs: 60 * 1000,
  });
  if (!limit.ok) return { ok: false, error: "AI briefing is rate limited." };

  const filters = parseReportFilters(params);

  if (!options.skipCache) {
    const cached = await getCachedAiReport<string>("daily_briefing", filters);
    if (cached) return { ok: true, data: cached, cached: true };
  }

  const ai = getOpenAI();
  if (!ai.ok) return { ok: false, error: ai.error };

  const context = await buildReportAiContext(filters);
  const response = await createResponse(
    ai,
    [
      {
        role: "system",
        content: `You are a concise cafe analyst. Use only the provided filtered aggregate data. Write a markdown briefing with ## headings and bullet lists covering revenue, paid orders, best seller, quiet period if visible, and exactly two practical actions. Mention that the answer is scoped to the selected filters. Do not invent missing data. ${AI_CURRENCY_INSTRUCTION}`,
      },
      { role: "user", content: JSON.stringify(context) },
    ],
    500,
  );
  if (!response.ok) return response;

  const text = response.data.trim();
  await cacheAiReport("daily_briefing", filters, text);
  revalidatePath("/admin/reports");
  return { ok: true, data: text };
}

export async function generateInventoryForecast(
  params: ReportSearchParams,
  options: AiActionOptions = {},
): Promise<AiActionResult<ForecastItem[]>> {
  const user = await requireRole("admin");
  const limit = checkRateLimit({
    scope: "ai:inventory_forecast",
    identifier: user.id,
    limit: 6,
    windowMs: 60 * 1000,
  });
  if (!limit.ok) return { ok: false, error: "AI forecast is rate limited." };

  const filters = parseReportFilters(params);

  if (!options.skipCache) {
    const cached = await getCachedAiReport<ForecastItem[]>(
      "inventory_forecast",
      filters,
    );
    if (cached && cached.length > 0) {
      return { ok: true, data: cached, cached: true };
    }
  }

  const [context, velocity, priorVelocity] = await Promise.all([
    buildReportAiContext(filters),
    getProductVelocity(filters),
    getProductVelocity(getPreviousPeriodForVelocity(filters)),
  ]);

  if (velocity.length === 0) {
    return {
      ok: false,
      error: "No product sales in this range to forecast prep needs.",
    };
  }

  const ai = getOpenAI();
  if (!ai.ok) {
    const fallback = buildDeterministicForecast(velocity, priorVelocity);
    await cacheAiReport("inventory_forecast", filters, fallback);
    return { ok: true, data: fallback };
  }

  const response = await createResponse(
    ai,
    [
      {
        role: "system",
        content:
          "You forecast cafe prep needs from filtered aggregate product velocity. Return only valid JSON: an array of up to 8 objects with product, perDay, trend, suggestion. Use trend values up, down, flat, or unknown. Do not include prose or markdown.",
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
    ],
    700,
  );

  let parsed: ForecastItem[] = [];
  if (response.ok) {
    parsed = parseForecastJson(response.data);
  }

  if (parsed.length === 0) {
    parsed = buildDeterministicForecast(velocity, priorVelocity);
  }

  if (parsed.length === 0) {
    return { ok: false, error: "Could not build an inventory forecast." };
  }

  await cacheAiReport("inventory_forecast", filters, parsed);
  revalidatePath("/admin/reports");
  return { ok: true, data: parsed };
}

export async function askReportQuestion(
  params: ReportSearchParams,
  question: string,
): Promise<AiActionResult> {
  const user = await requireRole("admin");
  const limit = checkRateLimit({
    scope: "ai:ask",
    identifier: user.id,
    limit: 10,
    windowMs: 60 * 1000,
  });
  if (!limit.ok) return { ok: false, error: "AI questions are rate limited." };

  const cleaned = question.trim();
  if (cleaned.length < 3) {
    return { ok: false, error: "Ask a reporting question first." };
  }

  const ai = getOpenAI();
  if (!ai.ok) return { ok: false, error: ai.error };

  const context = await buildReportAiContext(parseReportFilters(params));
  const response = await createResponse(
    ai,
    [
      {
        role: "system",
        content: `Answer questions about this cafe using only the provided filtered aggregate data. Use markdown with headings and bullets when helpful. If the data cannot answer the question, say what is missing instead of guessing. Mention the selected filters when relevant. Never mention customer PII. ${AI_CURRENCY_INSTRUCTION}`,
      },
      {
        role: "user",
        content: JSON.stringify({ question: cleaned, context }),
      },
    ],
    500,
  );
  if (!response.ok) return response;

  return { ok: true, data: response.data.trim() };
}

export async function clearAiCache(
  kind: "daily_briefing" | "inventory_forecast",
  params: ReportSearchParams,
): Promise<ActionResult> {
  const user = await requireRole("admin");
  const limit = checkRateLimit({
    scope: "ai:clear_cache",
    identifier: user.id,
    limit: 20,
    windowMs: 60 * 1000,
  });
  if (!limit.ok)
    return { ok: false, error: "AI cache resets are rate limited." };

  const filters = parseReportFilters(params);
  await db
    .delete(aiReports)
    .where(
      and(
        eq(aiReports.kind, cacheKind(kind, filters)),
        eq(aiReports.rangeStart, filters.start),
        eq(aiReports.rangeEnd, filters.end),
      ),
    );
  revalidatePath("/admin/reports");
  return { ok: true };
}

function getPreviousPeriodForVelocity(filters: ReportFilters) {
  const duration = filters.end.getTime() - filters.start.getTime();
  return {
    ...filters,
    start: new Date(filters.start.getTime() - duration),
    end: filters.start,
  };
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
    `employee:${filters.employeeIds.length ? [...filters.employeeIds].sort().join(",") : "all"}`,
    `session:${filters.sessionIds.length ? [...filters.sessionIds].sort().join(",") : "all"}`,
    `product:${filters.productIds.length ? [...filters.productIds].sort().join(",") : "all"}`,
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
    return {
      ok: false,
      error: "AI insights could not be generated right now.",
    };
  }
}
