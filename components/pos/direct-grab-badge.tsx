import { Package } from "lucide-react";
import { cn } from "@/lib/utils";

type DirectGrabBadgeProps = {
  className?: string;
  compact?: boolean;
};

/** Non-kitchen items the waiter grabs from fridge/counter — not from KDS. */
export function DirectGrabBadge({ className, compact = false }: DirectGrabBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded bg-sky-500/15 font-semibold text-sky-800 uppercase",
        compact ? "px-1 py-0.5 text-[9px]" : "px-1.5 py-0.5 text-[10px]",
        className,
      )}
    >
      <Package className={compact ? "size-2.5" : "size-3"} />
      {compact ? "Direct" : "Grab directly"}
    </span>
  );
}
