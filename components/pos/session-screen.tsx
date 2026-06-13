"use client";

import { Loader2, Play } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";
import { openSession } from "@/app/(pos)/pos/actions";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { formatMoney } from "@/lib/pos/pricing";

type SessionScreenProps = {
  lastClosedAt: string | null;
  lastClosingAmount: number | null;
};

export function SessionScreen({
  lastClosedAt,
  lastClosingAmount,
}: SessionScreenProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleOpen() {
    startTransition(async () => {
      const result = await openSession();
      if (result.ok) {
        toast.success(result.message ?? "Session opened.");
        router.refresh();
      } else {
        toast.error(result.error);
      }
    });
  }

  return (
    <div className="flex min-h-[calc(100vh-3.5rem)] items-center justify-center p-6">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle>POS Session</CardTitle>
          <CardDescription>
            Open a session to start taking orders.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {lastClosedAt ? (
            <div className="bg-muted rounded-lg p-4 text-sm">
              <p className="text-muted-foreground">Last session closed</p>
              <p className="font-medium">{formatSessionDate(lastClosedAt)}</p>
              {lastClosingAmount != null ? (
                <p className="text-muted-foreground mt-2">
                  Closing sales:{" "}
                  <span className="text-foreground font-medium">
                    {formatMoney(lastClosingAmount)}
                  </span>
                </p>
              ) : null}
            </div>
          ) : (
            <p className="text-muted-foreground text-center text-sm">
              No previous session on record.
            </p>
          )}
          <Button className="w-full" onClick={handleOpen} disabled={isPending}>
            {isPending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Play className="size-4" />
            )}
            Open Session
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

function formatSessionDate(value: string) {
  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "medium",
    timeZone: "Asia/Kolkata",
  }).format(new Date(value));
}
