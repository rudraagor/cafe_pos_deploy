import { requireUser } from "@/lib/auth";
import {
  getActiveCategories,
  getActiveProducts,
  getActivePromotions,
  getCustomers,
  getFloorsWithTables,
  getOccupiedTableIds,
} from "@/lib/pos/queries";
import { SessionScreen } from "@/components/pos/session-screen";
import { CartStoreHydration } from "@/components/pos/cart-store-hydration";
import { OrderView } from "@/components/pos/order-view";
import { getLastClosedSession, getOpenSessionForUser } from "@/lib/pos/session";

type PosPageProps = {
  searchParams: Promise<{ table?: string }>;
};

export default async function PosOrderPage({ searchParams }: PosPageProps) {
  const user = await requireUser();
  const { table: tableId } = await searchParams;

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
    occupiedSet,
  ] = await Promise.all([
    getActiveProducts(),
    getActiveCategories(),
    getActivePromotions(),
    getCustomers(),
    getFloorsWithTables(),
    getOccupiedTableIds(openSession.id),
  ]);

  return (
    <>
      <CartStoreHydration />
      <OrderView
      tableId={tableId ?? null}
      products={products.map((p) => ({
        id: p.id,
        name: p.name,
        price: p.price,
        taxRate: p.taxRate,
        isKitchenItem: p.isKitchenItem,
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
      occupiedTableIds={[...occupiedSet]}
    />
    </>
  );
}
