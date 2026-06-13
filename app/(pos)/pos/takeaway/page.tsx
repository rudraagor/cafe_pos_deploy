import { CartStoreHydration } from "@/components/pos/cart-store-hydration";
import { OrderView } from "@/components/pos/order-view";
import { SessionScreen } from "@/components/pos/session-screen";
import { requireUser } from "@/lib/auth";
import {
  getActiveCategories,
  getActiveProducts,
  getActivePromotions,
  getCustomers,
  getFloorsWithTables,
} from "@/lib/pos/queries";
import { getLastClosedSession, getOpenSessionForUser } from "@/lib/pos/session";

export default async function TakeawayPage() {
  const user = await requireUser();
  const openSession = await getOpenSessionForUser(user.id);
  if (!openSession) {
    const lastClosed = await getLastClosedSession(user.id);
    return (
      <SessionScreen
        lastClosedAt={lastClosed?.closedAt?.toISOString() ?? null}
        lastClosingAmount={
          lastClosed?.closingAmount ? Number(lastClosed.closingAmount) : null
        }
      />
    );
  }

  const [products, categories, promotions, customers, floors] =
    await Promise.all([
      getActiveProducts(),
      getActiveCategories(),
      getActivePromotions(),
      getCustomers(),
      getFloorsWithTables(),
    ]);

  return (
    <>
      <CartStoreHydration />
      <OrderView
        tableId={null}
        fulfillmentType="takeaway"
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
        occupiedTableIds={[]}
      />
    </>
  );
}
