import { PageHeader } from "@/components/admin/page-header";
import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { createProduct } from "./actions";
import {
  ProductFormDialog,
  type ProductCategoryOption,
} from "./product-form-dialog";
import { ProductTable, type ProductRow } from "./product-table";

export default async function ProductsPage() {
  await requireRole("admin");

  const [products, categories] = await Promise.all([
    db.query.products.findMany({
      columns: {
        id: true,
        name: true,
        categoryId: true,
        price: true,
        unitOfMeasure: true,
        taxRate: true,
        description: true,
        supportedModifiers: true,
        isKitchenItem: true,
      },
      with: {
        category: {
          columns: {
            name: true,
            color: true,
          },
        },
      },
      orderBy: (product, { asc }) => [asc(product.name)],
    }),
    db.query.categories.findMany({
      columns: {
        id: true,
        name: true,
        color: true,
      },
      orderBy: (category, { asc }) => [asc(category.name)],
    }),
  ]);

  const categoryOptions: ProductCategoryOption[] = categories;
  const rows: ProductRow[] = products.map((product) => ({
    id: product.id,
    name: product.name,
    categoryId: product.categoryId ?? "",
    categoryName: product.category?.name ?? null,
    categoryColor: product.category?.color ?? null,
    price: product.price,
    unitOfMeasure: product.unitOfMeasure,
    taxRate: product.taxRate,
    description: product.description ?? "",
    supportedModifiers: Array.isArray(product.supportedModifiers)
      ? product.supportedModifiers.map(String)
      : [],
    isKitchenItem: product.isKitchenItem,
  }));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Products"
        description="Create and maintain the menu items employees sell from the POS terminal."
        action={
          <ProductFormDialog
            mode="create"
            categories={categoryOptions}
            action={createProduct}
          />
        }
      />
      <ProductTable rows={rows} categories={categoryOptions} />
    </div>
  );
}
