"use client";

import { Loader2, Zap } from "lucide-react";
import { useEffect, useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { simulateLunchRushBurst } from "@/app/(dashboard)/admin/reports/demo-actions";
import { Button } from "@/components/ui/button";

const TARGET_ORDERS = 30;
const INTERVAL_MS = 10_000;

export function LunchRushButton() {
  const [created, setCreated] = useState(0);
  const [running, setRunning] = useState(false);
  const [isPending, startTransition] = useTransition();
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  function runBurst() {
    startTransition(async () => {
      const result = await simulateLunchRushBurst(1);
      if (!result.ok) {
        toast.error(result.error);
        stop();
        return;
      }
      setCreated((value) => {
        const next = value + (result.created ?? 1);
        if (next >= TARGET_ORDERS) {
          toast.success("Lunch rush simulation complete.");
          stop();
        }
        return Math.min(next, TARGET_ORDERS);
      });
    });
  }

  function start() {
    setCreated(0);
    setRunning(true);
    toast.info("Lunch rush started: 30 orders over about 5 minutes.");
    runBurst();
    timerRef.current = setInterval(runBurst, INTERVAL_MS);
  }

  function stop() {
    setRunning(false);
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = null;
  }

  return (
    <Button
      type="button"
      variant={running ? "default" : "outline"}
      size="sm"
      onClick={running ? stop : start}
      disabled={isPending && !running}
      title="Simulate live paid orders and kitchen tickets"
    >
      {isPending ? (
        <Loader2 className="size-4 animate-spin" />
      ) : (
        <Zap className="size-4" />
      )}
      {running ? `${created}/${TARGET_ORDERS}` : "Lunch rush"}
    </Button>
  );
}
