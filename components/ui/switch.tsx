"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

type SwitchProps = Omit<React.ComponentProps<"input">, "type">;

function Switch({ className, ...props }: SwitchProps) {
  return (
    <input
      type="checkbox"
      role="switch"
      data-slot="switch"
      className={cn(
        "peer checked:bg-primary focus-visible:ring-ring/50 bg-muted h-5 w-9 shrink-0 cursor-pointer appearance-none rounded-full border border-transparent [background-image:radial-gradient(circle_at_0.625rem_50%,var(--background)_0.375rem,transparent_0.4rem)] shadow-inner transition-colors outline-none checked:[background-image:radial-gradient(circle_at_calc(100%-0.625rem)_50%,var(--primary-foreground)_0.375rem,transparent_0.4rem)] focus-visible:ring-3 disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      {...props}
    />
  );
}

export { Switch };
