"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");
  const [product, setProduct] = useState("all");
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

  const categoryOptions = useMemo(
    () =>
      [
        ...new Set(
          tickets.flatMap((ticket) =>
            ticket.items
              .map((item) => item.categoryName)
              .filter((name): name is string => Boolean(name)),
          ),
        ),
      ].sort(),
    [tickets],
  );

  const productOptions = useMemo(
    () =>
      [
        ...new Map(
          tickets.flatMap((ticket) =>
            ticket.items.map((item) => [
              item.productId ?? item.nameSnapshot,
              item.nameSnapshot,
            ]),
          ),
        ).entries(),
      ].sort((a, b) => a[1].localeCompare(b[1])),
    [tickets],
  );

  const filteredTickets = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return tickets
      .map((ticket) => {
        const searchable = [
          ticket.orderNumber,
          ticket.tableLabel,
          ...ticket.items.map((item) => item.nameSnapshot),
        ]
          .join(" ")
          .toLowerCase();
        if (normalizedQuery && !searchable.includes(normalizedQuery)) return null;

        const filteredItems = ticket.items.filter((item) => {
          const categoryMatches =
            category === "all" || item.categoryName === category;
          const productMatches =
            product === "all" ||
            item.productId === product ||
            (!item.productId && item.nameSnapshot === product);
          return categoryMatches && productMatches;
        });

        if (filteredItems.length === 0) return null;
        return { ...ticket, items: filteredItems };
      })
      .filter((ticket): ticket is KdsTicket => ticket !== null);
  }, [category, product, query, tickets]);

  const grouped = useMemo(
    () =>
      Object.fromEntries(
        stages.map((stage) => [
          stage.id,
          filteredTickets.filter((ticket) => ticket.stage === stage.id),
        ]),
      ) as Record<(typeof stages)[number]["id"], KdsTicket[]>,
    [filteredTickets],
  );

  return (
    <div
      className={cn(
        "min-h-[calc(100vh-8rem)] rounded-lg transition-colors",
        flash && "bg-emerald-500/10",
      )}
    >
      <div className="mb-4 rounded-lg border bg-card/70 p-4">
        <div className="grid gap-3 md:grid-cols-[1.5fr_1fr_1fr]">
          <div className="space-y-2">
            <Label htmlFor="kds-search">Search tickets</Label>
            <Input
              id="kds-search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Order, table, or product"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="kds-category">Category</Label>
            <select
              id="kds-category"
              value={category}
              onChange={(event) => setCategory(event.target.value)}
              className="border-input bg-background h-9 w-full rounded-md border px-3 text-sm"
            >
              <option value="all">All categories</option>
              {categoryOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="kds-product">Product</Label>
            <select
              id="kds-product"
              value={product}
              onChange={(event) => setProduct(event.target.value)}
              className="border-input bg-background h-9 w-full rounded-md border px-3 text-sm"
            >
              <option value="all">All products</option>
              {productOptions.map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>
        </div>
        <p className="mt-3 text-sm text-muted-foreground">
          Showing {filteredTickets.length} of {tickets.length} tickets.
        </p>
      </div>
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
