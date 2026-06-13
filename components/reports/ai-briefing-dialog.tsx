"use client";

import { Loader2, Sparkles } from "lucide-react";
import { AiMarkdown } from "@/components/reports/ai-markdown";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type AiBriefingDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  subtitle?: string;
  content: string | null;
  loading?: boolean;
  onRegenerate?: () => void;
  regeneratePending?: boolean;
};

export function AiBriefingDialog({
  open,
  onOpenChange,
  title,
  subtitle,
  content,
  loading = false,
  onRegenerate,
  regeneratePending = false,
}: AiBriefingDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[85vh] max-w-2xl flex-col gap-0 overflow-hidden p-0 sm:max-w-2xl">
        <DialogHeader className="border-b px-4 py-4">
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="size-4" />
            {title}
          </DialogTitle>
          {subtitle ? <DialogDescription>{subtitle}</DialogDescription> : null}
        </DialogHeader>

        <div className="max-h-[60vh] overflow-y-auto px-4 py-4">
          {loading ? (
            <div className="text-muted-foreground flex items-center gap-2 py-8 text-sm">
              <Loader2 className="size-4 animate-spin" />
              Generating insight…
            </div>
          ) : content ? (
            <AiMarkdown content={content} />
          ) : (
            <p className="text-muted-foreground text-sm">
              No content yet. Generate a briefing to see the formatted overview here.
            </p>
          )}
        </div>

        <DialogFooter className="border-t px-4 py-4">
          {onRegenerate ? (
            <Button
              type="button"
              variant="outline"
              onClick={onRegenerate}
              disabled={loading || regeneratePending}
            >
              {regeneratePending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Sparkles className="size-4" />
              )}
              Regenerate
            </Button>
          ) : null}
          <Button type="button" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
