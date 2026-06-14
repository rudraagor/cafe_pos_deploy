import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PrintPageButton } from "@/components/pos/print-page-button";
import { TableQrOpenLink } from "@/components/pos/table-qr-button";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { tables } from "@/lib/db/schema";
import {
  buildTableQrDataUrl,
  getTableQrOrderUrl,
} from "@/lib/pos/qr-ordering";
import { eq } from "drizzle-orm";

type Props = {
  params: Promise<{ tableId: string }>;
};

export default async function TableQrPage({ params }: Props) {
  await requireUser();
  const { tableId } = await params;

  const table = await db.query.tables.findFirst({
    where: eq(tables.id, tableId),
    with: { floor: true },
  });
  if (!table) notFound();

  const url = getTableQrOrderUrl(table.id);
  const qrDataUrl = await buildTableQrDataUrl(table.id);

  return (
    <div className="mx-auto max-w-md space-y-4 p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link
            href="/pos/tables"
            className="text-muted-foreground text-sm hover:underline"
          >
            ← Table view
          </Link>
          <h1 className="mt-1 text-xl font-semibold">
            {table.floor.name} · Table {table.number}
          </h1>
          <p className="text-muted-foreground text-sm">
            Print or display this QR for guests to order from their phone.
          </p>
        </div>
        <PrintPageButton />
      </div>

      <div className="flex flex-col items-center rounded-xl border bg-card p-6">
        <Image
          src={qrDataUrl}
          alt={`QR order code for table ${table.number}`}
          width={256}
          height={256}
          unoptimized
          className="size-64 rounded-lg border bg-white p-3"
        />
        <p className="mt-4 break-all text-center text-xs text-muted-foreground">
          {url}
        </p>
        <TableQrOpenLink url={url} className="mt-4" />
      </div>
    </div>
  );
}
