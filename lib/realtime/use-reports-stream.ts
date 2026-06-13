"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

export function useReportsStream(enabled: boolean) {
  const router = useRouter();

  useEffect(() => {
    if (!enabled) return;
    const source = new EventSource("/api/reports/stream");

    function handleMessage() {
      router.refresh();
    }

    source.addEventListener("reports:changed", handleMessage);

    return () => {
      source.removeEventListener("reports:changed", handleMessage);
      source.close();
    };
  }, [enabled, router]);
}
