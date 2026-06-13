"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
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
  const [draftCategories, setDraftCategories] = useState<string[]>([]);
  const [draftProducts, setDraftProducts] = useState<string[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
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
    const categorySet = new Set(selectedCategories);
    const productSet = new Set(selectedProducts);

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
            categorySet.size === 0 ||
            (item.categoryName ? categorySet.has(item.categoryName) : false);
          const productValue = item.productId ?? item.nameSnapshot;
          const productMatches =
            productSet.size === 0 || productSet.has(productValue);
          return categoryMatches && productMatches;
        });

        if (filteredItems.length === 0) return null;
        return { ...ticket, items: filteredItems };
      })
      .filter((ticket): ticket is KdsTicket => ticket !== null);
  }, [query, selectedCategories, selectedProducts, tickets]);

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
        <div className="grid gap-3 lg:grid-cols-[1.5fr_1fr_1fr_auto]">
          <div className="space-y-2">
            <Label htmlFor="kds-search">Search tickets</Label>
            <Input
              id="kds-search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Order, table, or product"
            />
          </div>
          <KdsFilterMenu
            label="Categories"
            placeholder="All categories"
            values={draftCategories}
            options={categoryOptions.map((option) => ({
              value: option,
              label: option,
            }))}
            onChange={setDraftCategories}
          />
          <KdsFilterMenu
            label="Products"
            placeholder="All products"
            values={draftProducts}
            options={productOptions.map(([value, label]) => ({
              value,
              label,
            }))}
            onChange={setDraftProducts}
          />
          <div className="flex items-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setSelectedCategories(draftCategories);
                setSelectedProducts(draftProducts);
              }}
            >
              Apply
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                setDraftCategories([]);
                setDraftProducts([]);
                setSelectedCategories([]);
                setSelectedProducts([]);
              }}
            >
              Clear
            </Button>
          </div>
        </div>
        <p className="mt-3 text-sm text-muted-foreground">
          Showing {filteredTickets.length} of {tickets.length} tickets
          {selectedCategories.length + selectedProducts.length > 0
            ? ` with ${selectedCategories.length + selectedProducts.length} active filters.`
            : "."}
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

function KdsFilterMenu({
  label,
  placeholder,
  values,
  options,
  onChange,
}: {
  label: string;
  placeholder: string;
  values: string[];
  options: { value: string; label: string }[];
  onChange: (values: string[]) => void;
}) {
  const selected = new Set(values);
  const summary =
    values.length === 0
      ? placeholder
      : values.length === 1
        ? (options.find((option) => option.value === values[0])?.label ??
          "1 selected")
        : `${values.length} selected`;

  function toggle(value: string) {
    if (selected.has(value)) {
      onChange(values.filter((item) => item !== value));
      return;
    }
    onChange([...values, value]);
  }

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <details className="group relative">
        <summary
          className={cn(
            buttonVariants({ variant: "outline", size: "lg" }),
            "h-9 w-full cursor-pointer list-none justify-between px-3 [&::-webkit-details-marker]:hidden",
          )}
        >
          <span className="min-w-0 truncate text-left">{summary}</span>
          <ChevronDown className="size-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180" />
        </summary>
        <div className="absolute z-40 mt-2 max-h-72 w-full min-w-64 overflow-y-auto rounded-lg border bg-popover p-2 text-popover-foreground shadow-lg">
          {options.length === 0 ? (
            <p className="px-2 py-4 text-sm text-muted-foreground">
              No matching options yet.
            </p>
          ) : (
            <div className="space-y-1">
              {options.map((option) => (
                <label
                  key={option.value}
                  className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-muted"
                >
                  <input
                    type="checkbox"
                    checked={selected.has(option.value)}
                    onChange={() => toggle(option.value)}
                    className="size-4 rounded border-input"
                  />
                  <span className="min-w-0 truncate">{option.label}</span>
                </label>
              ))}
            </div>
          )}
        </div>
      </details>
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
