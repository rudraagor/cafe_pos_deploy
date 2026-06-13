import { cookies } from "next/headers";
import { KdsBoard } from "@/components/kds/kds-board";
import { KdsPinGate } from "@/components/kds/kds-pin-gate";
import { KDS_UNLOCK_COOKIE } from "@/lib/kds/access";
import { getKitchenTickets } from "@/lib/pos/queries";
import { formatMergedTableLabel } from "@/lib/pos/table-labels";

export const dynamic = "force-dynamic";

export default async function KdsPage() {
  const cookieStore = await cookies();
  const unlocked = cookieStore.get(KDS_UNLOCK_COOKIE)?.value === "true";
  if (!unlocked) return <KdsPinGate />;

  const tickets = await getKitchenTickets();

  return (
    <KdsBoard
      tickets={tickets.map((ticket) => ({
        id: ticket.id,
        orderNumber: ticket.orderNumber,
        stage: ticket.kdsStage,
        status: ticket.status,
        tableLabel:
          ticket.fulfillmentType === "takeaway"
            ? "Takeaway"
            : ticket.orderTables.length > 0
              ? formatMergedTableLabel(
                  ticket.orderTables
                    .slice()
                    .sort((a, b) => Number(b.isPrimary) - Number(a.isPrimary))
                    .map((row) => row.table),
                )
              : ticket.table
                ? `${ticket.table.floor?.name ?? "Floor"} / T${ticket.table.number}`
                : "Takeaway",
        sentToKitchenAt: (
          ticket.sentToKitchenAt ?? ticket.createdAt
        ).toISOString(),
        items: ticket.items.map((item) => ({
          id: item.id,
          productId: item.productId,
          nameSnapshot: item.nameSnapshot,
          categoryName: item.product?.category?.name ?? null,
          quantity: item.quantity,
          itemCompleted: item.itemCompleted,
          modifiers: Array.isArray(item.modifiers)
            ? item.modifiers.map(String)
            : [],
          note: item.note,
        })),
      }))}
    />
  );
}
