import { PageHeader } from "@/components/admin/page-header";
import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { createFloor } from "./actions";
import { BookingManagement, type BookingFloor } from "./booking-management";
import { FloorFormDialog } from "./floor-form-dialog";

export default async function BookingPage() {
  await requireRole("admin");

  const floors = await db.query.floors.findMany({
    columns: {
      id: true,
      name: true,
    },
    with: {
      tables: {
        columns: {
          id: true,
          number: true,
          seats: true,
          active: true,
        },
        orderBy: (table, { asc }) => [asc(table.number)],
      },
    },
    orderBy: (floor, { asc }) => [asc(floor.name)],
  });

  const rows: BookingFloor[] = floors;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Booking"
        description="Manage cafe floors and table cards for the POS table view."
        action={<FloorFormDialog mode="create" action={createFloor} />}
      />
      <BookingManagement floors={rows} />
    </div>
  );
}
