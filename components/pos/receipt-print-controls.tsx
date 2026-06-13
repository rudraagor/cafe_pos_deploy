"use client";

import { Printer } from "lucide-react";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";

export function ReceiptPrintControls({ autoPrint }: { autoPrint: boolean }) {
  useEffect(() => {
    if (!autoPrint) return;
    const timeout = window.setTimeout(() => window.print(), 350);
    return () => window.clearTimeout(timeout);
  }, [autoPrint]);

  return (
    <div className="print:hidden">
      <Button type="button" onClick={() => window.print()}>
        <Printer className="size-4" />
        Print receipt
      </Button>
    </div>
  );
}
