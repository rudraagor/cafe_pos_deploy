import { PageHeader } from "@/components/admin/page-header";
import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatMergedTableLabel } from "@/lib/pos/table-labels";
import { createFloor } from "./actions";
import {
  BookingManagement,
  type BookingFloor,
  type BookingReservation,
} from "./booking-management";
import { FloorFormDialog } from "./floor-form-dialog";

export default async function BookingPage() {
  await requireRole("admin");

  const [floors, reservations] = await Promise.all([
    db.query.floors.findMany({
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
    }),
    db.query.reservations.findMany({
      with: {
        reservationTables: { with: { table: { with: { floor: true } } } },
      },
      orderBy: (reservation, { desc }) => [desc(reservation.startAt)],
      limit: 25,
    }),
  ]);

  const rows: BookingFloor[] = floors;
  const reservationRows: BookingReservation[] = reservations.map((reservation) => {
    const linkedTables = reservation.reservationTables
      .slice()
      .sort((a, b) => Number(b.isPrimary) - Number(a.isPrimary))
      .map((row) => row.table);
    return {
      id: reservation.id,
      customerName: reservation.customerName,
      customerEmail: reservation.customerEmail,
      customerPhone: reservation.customerPhone,
      partySize: reservation.partySize,
      startAt: reservation.startAt.toISOString(),
      durationMinutes: reservation.durationMinutes,
      status: reservation.status,
      notes: reservation.notes,
      tableIds: linkedTables.map((table) => table.id),
      tableLabel: formatMergedTableLabel(linkedTables),
    };
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Booking"
        description="Manage cafe floors and table cards for the POS table view."
        action={<FloorFormDialog mode="create" action={createFloor} />}
      />
      <BookingManagement floors={rows} reservations={reservationRows} />
    </div>
  );
}
