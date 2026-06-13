"use client";

import { Copy, Download, FileText, Loader2, Sparkles } from "lucide-react";
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
import { toast } from "sonner";

type AiBriefingDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  subtitle?: string;
  content: string | null;
  loading?: boolean;
  onRegenerate?: () => void;
  regeneratePending?: boolean;
  downloadFilename?: string;
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
  downloadFilename = "ai-report",
}: AiBriefingDialogProps) {
  async function copyContent() {
    if (!content) return;
    await navigator.clipboard.writeText(content);
    toast.success("Copied to clipboard.");
  }

  function downloadMarkdown() {
    if (!content) return;
    const blob = new Blob([content], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${downloadFilename}.md`;
    anchor.click();
    URL.revokeObjectURL(url);
    toast.success("Markdown downloaded.");
  }

  function downloadText() {
    if (!content) return;
    const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${downloadFilename}.txt`;
    anchor.click();
    URL.revokeObjectURL(url);
    toast.success("Text file downloaded.");
  }

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
          {content ? (
            <>
              <Button type="button" variant="outline" onClick={copyContent}>
                <Copy className="size-4" />
                Copy
              </Button>
              <Button type="button" variant="outline" onClick={downloadMarkdown}>
                <Download className="size-4" />
                .md
              </Button>
              <Button type="button" variant="outline" onClick={downloadText}>
                <FileText className="size-4" />
                .txt
              </Button>
            </>
          ) : null}
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
