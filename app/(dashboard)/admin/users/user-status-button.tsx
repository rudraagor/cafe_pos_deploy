"use client";

import { Archive, Loader2, RotateCcw } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import type { ActionResult } from "@/lib/action-result";

type UserStatusButtonProps = {
  userName: string;
  archived: boolean;
  action: () => Promise<ActionResult>;
};

export function UserStatusButton({
  userName,
  archived,
  action,
}: UserStatusButtonProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const Icon = archived ? RotateCcw : Archive;
  const verb = archived ? "Restore" : "Archive";

  function handleAction() {
    startTransition(async () => {
      const result = await action();
      if (result.ok) {
        toast.success(result.message ?? `${verb} complete.`);
        setOpen(false);
        router.refresh();
        return;
      }
      toast.error(result.error);
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        aria-label={`${verb} ${userName}`}
        render={<Button type="button" variant="ghost" size="icon-sm" />}
      >
        <Icon className="size-4" />
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{verb} account?</DialogTitle>
          <DialogDescription>
            {archived
              ? `${userName} will be allowed to log in again.`
              : `${userName} will no longer be able to log in.`}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={isPending}
          >
            Cancel
          </Button>
          <Button type="button" onClick={handleAction} disabled={isPending}>
            {isPending ? <Loader2 className="size-4 animate-spin" /> : null}
            {verb}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
