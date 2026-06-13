import { cookies } from "next/headers";
import { KdsBoard } from "@/components/kds/kds-board";
import { KdsPinGate } from "@/components/kds/kds-pin-gate";
import { KDS_UNLOCK_COOKIE } from "@/lib/kds/access";
import { getKitchenTickets } from "@/lib/pos/queries";

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
        tableLabel: ticket.fulfillmentType === "takeaway"
          ? "Takeaway"
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
        })),
      }))}
    />
  );
}
