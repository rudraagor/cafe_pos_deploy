import { PageHeader } from "@/components/admin/page-header";
import { getCurrentUser, requireRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { createUserAccount } from "./actions";
import { UserFormDialog } from "./user-form-dialog";
import { UsersTable, type UserRow } from "./users-table";

export default async function UsersPage() {
  await requireRole("admin");
  const currentUser = await getCurrentUser();
  const users = await db.query.users.findMany({
    columns: {
      id: true,
      name: true,
      email: true,
      role: true,
      archivedAt: true,
    },
    orderBy: (user, { asc }) => [asc(user.name)],
  });

  const rows: UserRow[] = users.map((user) => ({
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    archived: !!user.archivedAt,
    current: user.id === currentUser?.id,
  }));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Users / Employees"
        description="Manage backend admins and POS employee accounts."
        action={<UserFormDialog mode="create" action={createUserAccount} />}
      />
      <UsersTable rows={rows} />
    </div>
  );
}
