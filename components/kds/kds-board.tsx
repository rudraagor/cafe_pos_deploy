"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useKdsStream } from "@/lib/realtime/use-kds-stream";
import { cn } from "@/lib/utils";
import { KdsStageColumn } from "./kds-stage-column";
import type { KdsTicket } from "./types";

type KdsBoardProps = {
  tickets: KdsTicket[];
};

const stages = [
  { id: "to_cook", title: "To Cook" },
  { id: "preparing", title: "Preparing" },
  { id: "completed", title: "Completed Recent" },
] as const;

export function KdsBoard({ tickets }: KdsBoardProps) {
  const [flash, setFlash] = useState(false);
  const openTicketCount = tickets.filter((t) => t.stage !== "completed").length;
  const previousOpenCount = useRef(openTicketCount);

  const onStreamMessage = useCallback(() => {
    // The actual "new ticket" check happens after router.refresh() updates props.
  }, []);

  useKdsStream(onStreamMessage);

  useEffect(() => {
    if (openTicketCount > previousOpenCount.current) {
      setFlash(true);
      playArrivalTone();
      const timeout = window.setTimeout(() => setFlash(false), 1400);
      previousOpenCount.current = openTicketCount;
      return () => window.clearTimeout(timeout);
    }
    previousOpenCount.current = openTicketCount;
  }, [openTicketCount]);

  const grouped = useMemo(
    () =>
      Object.fromEntries(
        stages.map((stage) => [
          stage.id,
          tickets.filter((ticket) => ticket.stage === stage.id),
        ]),
      ) as Record<(typeof stages)[number]["id"], KdsTicket[]>,
    [tickets],
  );

  return (
    <div
      className={cn(
        "min-h-[calc(100vh-8rem)] rounded-lg transition-colors",
        flash && "bg-emerald-500/10",
      )}
    >
      <div className="grid gap-4 lg:grid-cols-3">
        {stages.map((stage) => (
          <KdsStageColumn
            key={stage.id}
            stage={stage.id}
            title={stage.title}
            tickets={grouped[stage.id]}
          />
        ))}
      </div>
    </div>
  );
}

function playArrivalTone() {
  try {
    const AudioContextConstructor: typeof window.AudioContext | undefined =
      window.AudioContext ||
      (window as typeof window & {
        webkitAudioContext?: typeof window.AudioContext;
      }).webkitAudioContext;
    if (!AudioContextConstructor) return;

    const context = new AudioContextConstructor();
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.frequency.value = 880;
    gain.gain.value = 0.05;
    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.start();
    oscillator.stop(context.currentTime + 0.12);
  } catch {
    // Audio can be blocked before user interaction; visual flash still works.
  }
}
