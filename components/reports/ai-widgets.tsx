"use client";

import {
  ArrowDown,
  ArrowUp,
  Bot,
  Loader2,
  Minus,
  Send,
  Sparkles,
} from "lucide-react";
import { useEffect, useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import {
  askReportQuestion,
  generateDailyBriefing,
  generateInventoryForecast,
} from "@/app/(dashboard)/admin/reports/ai-actions";
import type { ForecastItem } from "@/lib/reports/forecast-fallback";
import { AiBriefingDialog } from "@/components/reports/ai-briefing-dialog";
import { markdownPreview } from "@/components/reports/ai-markdown";
import {
  SortableColumn,
  SortableDataTable,
} from "@/components/reports/sortable-table";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  formatReportDate,
  parseReportFilters,
  rangePresets,
  type ReportSearchParams,
} from "@/lib/reports/range";

const QA_HISTORY_KEY = "cafe-reports-qa-history";

type QaHistoryEntry = {
  question: string;
  answer: string;
  at: string;
};

function readQaHistory(): QaHistoryEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = sessionStorage.getItem(QA_HISTORY_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as QaHistoryEntry[];
  } catch {
    return [];
  }
}

function pushQaHistory(question: string, answer: string) {
  const next = [
    { question, answer, at: new Date().toISOString() },
    ...readQaHistory(),
  ].slice(0, 5);
  sessionStorage.setItem(QA_HISTORY_KEY, JSON.stringify(next));
  return next;
}

function reportRangeLabel(params: ReportSearchParams) {
  const filters = parseReportFilters(params);
  const presetLabel =
    rangePresets.find((preset) => preset.value === filters.preset)?.label ??
    "Custom range";

  if (filters.preset === "custom") {
    const start = formatReportDate(filters.start);
    const end = formatReportDate(new Date(filters.end.getTime() - 1));
    return `${presetLabel}: ${start} – ${end}`;
  }

  return presetLabel;
}

function trendIcon(trend: string) {
  if (trend === "up") return <ArrowUp className="size-3.5 text-emerald-600" />;
  if (trend === "down") return <ArrowDown className="size-3.5 text-red-600" />;
  return <Minus className="text-muted-foreground size-3.5" />;
}

export function AiWidgets({ params }: { params: ReportSearchParams }) {
  const rangeLabel = useMemo(() => reportRangeLabel(params), [params]);
  const [briefing, setBriefing] = useState<string | null>(null);
  const [forecast, setForecast] = useState<ForecastItem[] | null>(null);
  const [answer, setAnswer] = useState<string | null>(null);
  const [qaHistory, setQaHistory] = useState<QaHistoryEntry[]>([]);
  const [, startHydrateTransition] = useTransition();
  const [briefingDialogOpen, setBriefingDialogOpen] = useState(false);
  const [forecastDialogOpen, setForecastDialogOpen] = useState(false);
  const [answerDialogOpen, setAnswerDialogOpen] = useState(false);
  const [isBriefingPending, startBriefing] = useTransition();
  const [isForecastPending, startForecast] = useTransition();
  const [isAskPending, startAsk] = useTransition();

  useEffect(() => {
    startHydrateTransition(() => {
      setQaHistory(readQaHistory());
    });
  }, [startHydrateTransition]);

  const forecastColumns: SortableColumn<ForecastItem>[] = [
    {
      key: "product",
      label: "Product",
      sortable: true,
      sortValue: (row) => row.product,
      render: (row) => row.product,
    },
    {
      key: "perDay",
      label: "Per day",
      align: "right",
      sortable: true,
      sortValue: (row) => row.perDay,
      render: (row) => row.perDay,
    },
    {
      key: "trend",
      label: "Trend",
      sortable: true,
      sortValue: (row) => row.trend,
      render: (row) => (
        <span className="inline-flex items-center gap-1 capitalize">{trendIcon(row.trend)}{row.trend}</span>
      ),
    },
    {
      key: "suggestion",
      label: "Suggestion",
      render: (row) => row.suggestion,
    },
  ];

  function runBriefing(skipCache = false, openDialog = true) {
    if (openDialog) setBriefingDialogOpen(true);
    startBriefing(async () => {
      const result = await generateDailyBriefing(params, { skipCache });
      if (result.ok) {
        setBriefing(result.data ?? "");
        setBriefingDialogOpen(true);
        toast.success(
          result.cached ? "Loaded cached briefing." : "Briefing generated.",
        );
      } else {
        toast.error(result.error);
      }
    });
  }

  function runForecast(skipCache = false, openDialog = true) {
    if (openDialog) setForecastDialogOpen(true);
    startForecast(async () => {
      const result = await generateInventoryForecast(params, { skipCache });
      if (result.ok) {
        setForecast(result.data ?? []);
        setForecastDialogOpen(true);
        toast.success(
          result.cached ? "Loaded cached forecast." : "Forecast generated.",
        );
      } else {
        toast.error(result.error);
      }
    });
  }

  function ask(formData: FormData) {
    const question = String(formData.get("question") ?? "");
    startAsk(async () => {
      const result = await askReportQuestion(params, question);
      if (result.ok) {
        const nextAnswer = result.data ?? "";
        setAnswer(nextAnswer);
        setQaHistory(pushQaHistory(question, nextAnswer));
        setAnswerDialogOpen(true);
      } else {
        toast.error(result.error);
      }
    });
  }

  const forecastMarkdown =
    forecast && forecast.length > 0
      ? `# Inventory forecast\n\n${forecast
          .map(
            (item) =>
              `- **${item.product}**: ${item.perDay}/day (${item.trend}) — ${item.suggestion}`,
          )
          .join("\n")}`
      : null;

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="size-4" />
            AI insights
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="briefing">
            <TabsList>
              <TabsTrigger value="briefing">Daily briefing</TabsTrigger>
              <TabsTrigger value="forecast">Inventory advisor</TabsTrigger>
              <TabsTrigger value="ask">Ask data</TabsTrigger>
            </TabsList>

            <TabsContent value="briefing" className="space-y-3 pt-3">
              <div className="flex flex-wrap gap-2">
                <Button onClick={() => runBriefing(false, true)} disabled={isBriefingPending}>
                  {isBriefingPending ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Sparkles className="size-4" />
                  )}
                  Generate briefing
                </Button>
                {briefing ? (
                  <Button variant="outline" onClick={() => setBriefingDialogOpen(true)}>
                    View briefing
                  </Button>
                ) : null}
              </div>
              <p className="text-muted-foreground line-clamp-2 text-sm">
                {briefing
                  ? markdownPreview(briefing)
                  : "Generate a concise sales briefing for this range."}
              </p>
            </TabsContent>

            <TabsContent value="forecast" className="space-y-3 pt-3">
              <div className="flex flex-wrap gap-2">
                <Button onClick={() => runForecast(false, true)} disabled={isForecastPending}>
                  {isForecastPending ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Bot className="size-4" />
                  )}
                  Generate forecast
                </Button>
                {forecast && forecast.length > 0 ? (
                  <Button variant="outline" onClick={() => setForecastDialogOpen(true)}>
                    View forecast
                  </Button>
                ) : null}
              </div>
              {forecast && forecast.length > 0 ? (
                <SortableDataTable
                  rows={forecast}
                  columns={forecastColumns}
                  rowKey={(row) => `${row.product}-${row.suggestion}`}
                />
              ) : (
                <p className="text-muted-foreground text-sm">
                  Forecast restock/prep needs from product velocity.
                </p>
              )}
            </TabsContent>

            <TabsContent value="ask" className="space-y-3 pt-3">
              <form action={ask} className="flex gap-2">
                <Input
                  name="question"
                  placeholder="Top 3 items this week?"
                  autoComplete="off"
                />
                <Button type="submit" disabled={isAskPending}>
                  {isAskPending ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Send className="size-4" />
                  )}
                </Button>
              </form>
              <p className="text-muted-foreground line-clamp-2 text-sm">
                {answer
                  ? markdownPreview(answer)
                  : "Ask one grounded question about this range."}
              </p>
              {answer ? (
                <Button variant="outline" size="sm" onClick={() => setAnswerDialogOpen(true)}>
                  View answer
                </Button>
              ) : null}
              {qaHistory.length > 0 ? (
                <div className="space-y-2">
                  <p className="text-sm font-medium">Recent questions</p>
                  <ul className="space-y-1">
                    {qaHistory.map((entry) => (
                      <li key={entry.at}>
                        <button
                          type="button"
                          className="text-primary hover:underline text-left text-sm"
                          onClick={() => {
                            setAnswer(`**Q:** ${entry.question}\n\n${entry.answer}`);
                            setAnswerDialogOpen(true);
                          }}
                        >
                          {entry.question}
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <AiBriefingDialog
        open={briefingDialogOpen}
        onOpenChange={setBriefingDialogOpen}
        title="AI daily briefing"
        subtitle={rangeLabel}
        content={briefing}
        loading={isBriefingPending && !briefing}
        onRegenerate={() => runBriefing(true, false)}
        regeneratePending={isBriefingPending}
        downloadFilename={`briefing-${rangeLabel.replace(/\s+/g, "-").toLowerCase()}`}
      />

      <AiBriefingDialog
        open={forecastDialogOpen}
        onOpenChange={setForecastDialogOpen}
        title="Inventory advisor"
        subtitle={rangeLabel}
        content={forecastMarkdown}
        loading={isForecastPending && !forecast?.length}
        onRegenerate={() => runForecast(true, false)}
        regeneratePending={isForecastPending}
        downloadFilename={`forecast-${rangeLabel.replace(/\s+/g, "-").toLowerCase()}`}
      />

      <AiBriefingDialog
        open={answerDialogOpen}
        onOpenChange={setAnswerDialogOpen}
        title="AI answer"
        subtitle={rangeLabel}
        content={answer}
        loading={isAskPending && !answer}
        downloadFilename={`answer-${rangeLabel.replace(/\s+/g, "-").toLowerCase()}`}
      />
    </>
  );
}
