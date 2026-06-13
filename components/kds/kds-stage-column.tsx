import type { KdsStage, KdsTicket } from "./types";
import { TicketCard } from "./ticket-card";

type KdsStageColumnProps = {
  stage: KdsStage;
  title: string;
  tickets: KdsTicket[];
};

const emptyCopy: Record<KdsStage, string> = {
  to_cook: "No waiting tickets.",
  preparing: "Nothing in progress.",
  completed: "No recently completed tickets.",
};

export function KdsStageColumn({
  stage,
  title,
  tickets,
}: KdsStageColumnProps) {
  return (
    <section className="min-h-[calc(100vh-8rem)] rounded-lg border bg-card/70">
      <header className="flex items-center justify-between border-b px-4 py-3">
        <h2 className="font-semibold">{title}</h2>
        <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-semibold">
          {tickets.length}
        </span>
      </header>
      <div className="space-y-3 p-3">
        {tickets.length === 0 ? (
          <div className="flex min-h-32 items-center justify-center rounded-lg border border-dashed text-sm text-muted-foreground">
            {emptyCopy[stage]}
          </div>
        ) : (
          tickets.map((ticket) => (
            <TicketCard key={ticket.id} ticket={ticket} />
          ))
        )}
      </div>
    </section>
  );
}
