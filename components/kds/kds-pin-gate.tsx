"use client";

import { Lock, Loader2 } from "lucide-react";
import { useActionState } from "react";
import { unlockKds } from "@/app/kds/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function KdsPinGate() {
  const [state, action, isPending] = useActionState(unlockKds, null);

  return (
    <div className="mx-auto flex min-h-[calc(100vh-8rem)] max-w-sm flex-col justify-center gap-5">
      <div className="space-y-2 text-center">
        <div className="mx-auto flex size-12 items-center justify-center rounded-lg border bg-card">
          <Lock className="size-6 text-muted-foreground" />
        </div>
        <h1 className="text-xl font-semibold">Kitchen PIN</h1>
        <p className="text-sm text-muted-foreground">
          Unlock the shared kitchen display screen.
        </p>
      </div>

      <form action={action} className="space-y-3 rounded-lg border bg-card p-4">
        <div className="space-y-2">
          <Label htmlFor="kds-pin">PIN</Label>
          <Input
            id="kds-pin"
            name="pin"
            type="password"
            inputMode="numeric"
            autoComplete="off"
            autoFocus
            aria-invalid={state?.ok === false}
          />
          {state?.ok === false ? (
            <p className="text-sm text-destructive">{state.error}</p>
          ) : null}
        </div>
        <Button type="submit" className="w-full" disabled={isPending}>
          {isPending ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Lock className="size-4" />
          )}
          Unlock KDS
        </Button>
      </form>
    </div>
  );
}
