"use client";

import { Radio } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useReportsStream } from "@/lib/realtime/use-reports-stream";

export function LiveToggle() {
  const [live, setLive] = useState(false);
  useReportsStream(live);

  return (
    <Button
      type="button"
      variant={live ? "default" : "outline"}
      size="sm"
      onClick={() => setLive((value) => !value)}
    >
      <Radio className="size-4" />
      {live ? "Live on" : "Live off"}
    </Button>
  );
}
