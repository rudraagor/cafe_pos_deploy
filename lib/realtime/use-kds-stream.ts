"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

export function useKdsStream(onMessage?: () => void) {
  const router = useRouter();

  useEffect(() => {
    const source = new EventSource("/api/kds/stream");

    function handleMessage() {
      onMessage?.();
      router.refresh();
    }

    source.addEventListener("kds:changed", handleMessage);

    return () => {
      source.removeEventListener("kds:changed", handleMessage);
      source.close();
    };
  }, [onMessage, router]);
}
