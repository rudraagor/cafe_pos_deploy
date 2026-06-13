import { requireUser } from "@/lib/auth";
import {
  getActiveCategories,
  getActiveProducts,
  getActivePromotions,
  getCustomers,
  getActiveTableOccupancies,
  getFloorsWithTables,
  getReservationForCart,
} from "@/lib/pos/queries";
import { SessionScreen } from "@/components/pos/session-screen";
import { CartStoreHydration } from "@/components/pos/cart-store-hydration";
import { OrderView } from "@/components/pos/order-view";
import { getLastClosedSession, getOpenSessionForUser } from "@/lib/pos/session";
import { redirect } from "next/navigation";

type PosPageProps = {
  searchParams: Promise<{ table?: string; tables?: string; edit?: string; reservation?: string }>;
};

export default async function PosOrderPage({ searchParams }: PosPageProps) {
  const user = await requireUser();
  const {
    table: tableId,
    tables: tableIdsParam,
    edit: editOrderId,
    reservation: reservationId,
  } = await searchParams;

  const openSession = await getOpenSessionForUser(user.id);
  if (!openSession) {
    const lastClosed = await getLastClosedSession(user.id);
    return (
      <SessionScreen
        lastClosedAt={lastClosed?.closedAt?.toISOString() ?? null}
        lastClosingAmount={
          lastClosed?.closingAmount
            ? Number(lastClosed.closingAmount)
            : null
        }
      />
    );
  }

  const [
    products,
    categories,
    promotions,
    customers,
    floors,
    activeTableOrders,
    reservation,
  ] = await Promise.all([
    getActiveProducts(),
    getActiveCategories(),
    getActivePromotions(),
    getCustomers(),
    getFloorsWithTables(),
    getActiveTableOccupancies(openSession.id),
    reservationId ? getReservationForCart(reservationId) : Promise.resolve(null),
  ]);
  const occupiedOrdersByTable = Object.fromEntries(activeTableOrders);
  const selectedTableIds = Array.from(
    new Set(
      (tableIdsParam?.split(",").filter(Boolean) ?? []).length > 0
        ? tableIdsParam!.split(",").filter(Boolean)
        : reservation?.reservationTables.length
          ? reservation.reservationTables.map((row) => row.tableId)
          : tableId
            ? [tableId]
            : [],
    ),
  );
  const activeOrder = tableId ? occupiedOrdersByTable[tableId] : null;
  if (
    activeOrder?.kind === "order" &&
    activeOrder.orderId !== editOrderId
  ) {
    redirect(`/pos/orders/${activeOrder.orderId}`);
  }
  if (
    activeOrder?.kind === "reservation" &&
    activeOrder.reservationId !== reservationId
  ) {
    redirect(
      `/pos?table=${activeOrder.primaryTableId}&tables=${activeOrder.tableIds.join(",")}&reservation=${activeOrder.reservationId}`,
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden">
      <CartStoreHydration />
      <OrderView
        tableId={tableId ?? null}
        tableIds={selectedTableIds}
        reservationId={reservationId ?? null}
        initialReservationCustomerName={reservation?.customerName ?? null}
        products={products.map((p) => ({
          id: p.id,
          name: p.name,
          price: p.price,
          taxRate: p.taxRate,
          isKitchenItem: p.isKitchenItem,
          isOutOfStock: p.isOutOfStock,
          supportedModifiers: Array.isArray(p.supportedModifiers)
            ? p.supportedModifiers.map(String)
            : [],
          categoryId: p.categoryId,
          categoryName: p.categoryName,
          categoryColor: p.categoryColor,
        }))}
        categories={categories.map((c) => ({
          id: c.id,
          name: c.name,
          color: c.color,
        }))}
        promotions={promotions}
        customers={customers.map((c) => ({
          id: c.id,
          name: c.name,
          email: c.email,
        }))}
        floors={floors.map((f) => ({
          id: f.id,
          name: f.name,
          tables: f.tables,
        }))}
        occupiedTableIds={Object.keys(occupiedOrdersByTable)}
        occupiedOrdersByTable={occupiedOrdersByTable}
      />
    </div>
  );
}
