import { notFound } from "next/navigation";
import { CustomerOrderForm } from "@/components/qr/customer-order-form";
import {
  getActiveCategories,
  getActiveProducts,
  getTableById,
} from "@/lib/pos/queries";
import { verifyTableOrderToken } from "@/lib/pos/qr-ordering";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ token: string }>;
};

export default async function QrOrderPage({ params }: Props) {
  const { token } = await params;
  const verified = verifyTableOrderToken(token);
  if (!verified) notFound();

  const [table, products, categories] = await Promise.all([
    getTableById(verified.tableId),
    getActiveProducts(),
    getActiveCategories(),
  ]);
  if (!table || !table.active) notFound();

  return (
    <CustomerOrderForm
      token={token}
      tableLabel={`${table.floor?.name ?? "Floor"} / Table ${table.number}`}
      products={products.map((product) => ({
        id: product.id,
        name: product.name,
        price: product.price,
        isOutOfStock: product.isOutOfStock,
        supportedModifiers: Array.isArray(product.supportedModifiers)
          ? product.supportedModifiers.map(String)
          : [],
        categoryId: product.categoryId,
        categoryName: product.categoryName,
        categoryColor: product.categoryColor,
      }))}
      categories={categories.map((category) => ({
        id: category.id,
        name: category.name,
        color: category.color,
      }))}
    />
  );
}
