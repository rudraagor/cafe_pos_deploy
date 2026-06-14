import type { MouseEvent } from "react";
import { ExternalLink, QrCode } from "lucide-react";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function TableQrButton({
  tableId,
  tableNumber,
  variant = "icon",
  className,
  onClick,
}: {
  tableId: string;
  tableNumber: number;
  variant?: "icon" | "sm";
  className?: string;
  onClick?: (event: MouseEvent) => void;
}) {
  const href = `/pos/tables/${tableId}/qr`;

  if (variant === "sm") {
    return (
      <Link
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        onClick={onClick}
        className={cn(
          buttonVariants({ variant: "outline", size: "sm" }),
          className,
        )}
      >
        <QrCode className="size-4" />
        QR
      </Link>
    );
  }

  return (
    <Link
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      onClick={onClick}
      title={`Open QR for table ${tableNumber}`}
      aria-label={`Open QR for table ${tableNumber}`}
      className={cn(
        buttonVariants({ variant: "outline", size: "icon-sm" }),
        className,
      )}
    >
      <QrCode className="size-4" />
    </Link>
  );
}

export function TableQrOpenLink({
  url,
  className,
}: {
  url: string;
  className?: string;
}) {
  return (
    <Link
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        buttonVariants({ variant: "outline", size: "sm" }),
        className,
      )}
    >
      <ExternalLink className="size-4" />
      Customer page
    </Link>
  );
}
