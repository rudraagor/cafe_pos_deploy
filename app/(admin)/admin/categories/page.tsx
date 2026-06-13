import { PageHeader } from "@/components/admin/page-header";
import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { CategoryFormDialog } from "./category-form-dialog";
import { CategoryTable, type CategoryRow } from "./category-table";
import { createCategory } from "./actions";

export default async function CategoriesPage() {
  await requireRole("admin");

  const categories = await db.query.categories.findMany({
    columns: {
      id: true,
      name: true,
      color: true,
    },
    with: {
      products: {
        columns: {
          id: true,
        },
      },
    },
    orderBy: (category, { asc }) => [asc(category.name)],
  });

  const rows: CategoryRow[] = categories.map((category) => ({
    id: category.id,
    name: category.name,
    color: category.color,
    productCount: category.products.length,
  }));
  const usedColors = rows.map((row) => row.color);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Categories"
        description="Manage the menu groups and colors that carry into the POS experience."
        action={
          <CategoryFormDialog
            mode="create"
            action={createCategory}
            usedColors={usedColors}
          />
        }
      />
      <CategoryTable rows={rows} usedColors={usedColors} />
    </div>
  );
}
