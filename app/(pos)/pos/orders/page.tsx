import { requireUser } from "@/lib/auth";
import { OrdersTable } from "@/components/pos/orders-table";
import { getSessionOrders } from "@/lib/pos/queries";
import { getOpenSessionForUser } from "@/lib/pos/session";
import { redirect } from "next/navigation";

export default async function PosOrdersPage() {
  const user = await requireUser();
  const session = await getOpenSessionForUser(user.id);
  if (!session) redirect("/pos");

  const orders = await getSessionOrders(session.id);

  return (
    <div className="p-6">
      <h1 className="mb-4 text-xl font-semibold">Orders</h1>
      <OrdersTable
        orders={orders.map((o) => ({
          id: o.id,
          orderNumber: o.orderNumber,
          createdAt: o.createdAt.toISOString(),
          customerName: o.customer?.name ?? null,
          total: o.total,
          status: o.status,
          tableNumber: o.table?.number ?? null,
        }))}
      />
    </div>
  );
}
