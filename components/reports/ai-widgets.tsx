"use client";

import { Bot, Loader2, Send, Sparkles } from "lucide-react";
import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import {
  askReportQuestion,
  generateDailyBriefing,
  generateInventoryForecast,
} from "@/app/(admin)/admin/reports/ai-actions";
import { AiBriefingDialog } from "@/components/reports/ai-briefing-dialog";
import { markdownPreview } from "@/components/reports/ai-markdown";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  parseReportFilters,
  rangePresets,
  type ReportSearchParams,
} from "@/lib/reports/range";

type ForecastItem = {
  product: string;
  perDay: number;
  trend: string;
  suggestion: string;
};

function reportRangeLabel(params: ReportSearchParams) {
  const filters = parseReportFilters(params);
  const presetLabel =
    rangePresets.find((preset) => preset.value === filters.preset)?.label ??
    "Custom range";

  if (filters.preset === "custom") {
    const start = filters.start.toLocaleDateString();
    const end = new Date(filters.end.getTime() - 1).toLocaleDateString();
    return `${presetLabel}: ${start} – ${end}`;
  }

  return presetLabel;
}

export function AiWidgets({ params }: { params: ReportSearchParams }) {
  const rangeLabel = useMemo(() => reportRangeLabel(params), [params]);
  const [briefing, setBriefing] = useState<string | null>(null);
  const [forecast, setForecast] = useState<ForecastItem[] | null>(null);
  const [answer, setAnswer] = useState<string | null>(null);
  const [briefingDialogOpen, setBriefingDialogOpen] = useState(false);
  const [answerDialogOpen, setAnswerDialogOpen] = useState(false);
  const [isBriefingPending, startBriefing] = useTransition();
  const [isForecastPending, startForecast] = useTransition();
  const [isAskPending, startAsk] = useTransition();

  function runBriefing(openDialog = true) {
    if (openDialog) {
      setBriefingDialogOpen(true);
    }
    startBriefing(async () => {
      const result = await generateDailyBriefing(params);
      if (result.ok) {
        setBriefing(result.data ?? "");
        setBriefingDialogOpen(true);
        toast.success(result.cached ? "Loaded cached briefing." : "Briefing generated.");
      } else {
        toast.error(result.error);
      }
    });
  }

  function runForecast() {
    startForecast(async () => {
      const result = await generateInventoryForecast(params);
      if (result.ok) {
        setForecast(result.data ?? []);
        toast.success(result.cached ? "Loaded cached forecast." : "Forecast generated.");
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
        setAnswer(result.data ?? "");
        setAnswerDialogOpen(true);
      } else {
        toast.error(result.error);
      }
    });
  }

  return (
    <>
      <div className="grid gap-4 xl:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="size-4" />
              AI daily briefing
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex flex-wrap gap-2">
              <Button onClick={() => runBriefing(true)} disabled={isBriefingPending}>
                {isBriefingPending ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Sparkles className="size-4" />
                )}
                Generate briefing
              </Button>
              {briefing ? (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setBriefingDialogOpen(true)}
                >
                  View briefing
                </Button>
              ) : null}
            </div>
            <p className="text-muted-foreground line-clamp-2 text-sm">
              {briefing
                ? markdownPreview(briefing)
                : "Generate a concise sales briefing for this range."}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bot className="size-4" />
              Inventory forecast
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button onClick={runForecast} disabled={isForecastPending}>
              {isForecastPending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Bot className="size-4" />
              )}
              Generate forecast
            </Button>
            {forecast ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead>Per day</TableHead>
                    <TableHead>Suggestion</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {forecast.map((item) => (
                    <TableRow key={`${item.product}-${item.suggestion}`}>
                      <TableCell>{item.product}</TableCell>
                      <TableCell>{item.perDay}</TableCell>
                      <TableCell>{item.suggestion}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <p className="text-muted-foreground text-sm">
                Forecast restock/prep needs from product velocity.
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Ask your cafe data</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
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
            <div className="space-y-2">
              <p className="text-muted-foreground line-clamp-2 text-sm">
                {answer
                  ? markdownPreview(answer)
                  : "Ask one grounded question about this range."}
              </p>
              {answer ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setAnswerDialogOpen(true)}
                >
                  View answer
                </Button>
              ) : null}
            </div>
          </CardContent>
        </Card>
      </div>

      <AiBriefingDialog
        open={briefingDialogOpen}
        onOpenChange={setBriefingDialogOpen}
        title="AI daily briefing"
        subtitle={rangeLabel}
        content={briefing}
        loading={isBriefingPending && !briefing}
        onRegenerate={() => runBriefing(false)}
        regeneratePending={isBriefingPending}
      />

      <AiBriefingDialog
        open={answerDialogOpen}
        onOpenChange={setAnswerDialogOpen}
        title="AI answer"
        subtitle={rangeLabel}
        content={answer}
        loading={isAskPending && !answer}
      />
    </>
  );
}
