"use client";

import ReactMarkdown from "react-markdown";
import { cn } from "@/lib/utils";

export function AiMarkdown({
  content,
  className,
}: {
  content: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "space-y-3 text-sm leading-relaxed text-foreground [&_li]:my-1 [&_ol]:list-decimal [&_ol]:pl-5 [&_ul]:list-disc [&_ul]:pl-5",
        className,
      )}
    >
      <ReactMarkdown
        components={{
          h1: ({ children }) => (
            <h3 className="font-heading text-base font-semibold">{children}</h3>
          ),
          h2: ({ children }) => (
            <h3 className="font-heading text-base font-semibold">{children}</h3>
          ),
          h3: ({ children }) => (
            <h4 className="font-medium text-foreground">{children}</h4>
          ),
          p: ({ children }) => (
            <p className="text-muted-foreground">{children}</p>
          ),
          strong: ({ children }) => (
            <strong className="font-semibold text-foreground">{children}</strong>
          ),
          ul: ({ children }) => <ul className="space-y-1">{children}</ul>,
          ol: ({ children }) => <ol className="space-y-1">{children}</ol>,
          li: ({ children }) => (
            <li className="text-muted-foreground marker:text-muted-foreground/70">
              {children}
            </li>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}

export function markdownPreview(content: string, maxLength = 180) {
  const plain = content
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/\*(.+?)\*/g, "$1")
    .replace(/^[-*]\s+/gm, "")
    .replace(/\n+/g, " ")
    .trim();

  if (plain.length <= maxLength) return plain;
  return `${plain.slice(0, maxLength).trimEnd()}…`;
}
