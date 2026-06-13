import { requireUser } from "@/lib/auth";
import { TableGrid } from "@/components/pos/table-grid";
import { createReservation } from "@/app/(dashboard)/admin/booking/actions";
import { ReservationFormDialog } from "@/app/(dashboard)/admin/booking/reservation-form-dialog";
import {
  getActiveTableOccupancies,
  getFloorsWithTables,
} from "@/lib/pos/queries";
import { getOpenSessionForUser } from "@/lib/pos/session";
import { redirect } from "next/navigation";

export default async function PosTablesPage() {
  const user = await requireUser();
  const session = await getOpenSessionForUser(user.id);
  if (!session) redirect("/pos");

  const [floors, activeTableOrders] = await Promise.all([
    getFloorsWithTables(),
    getActiveTableOccupancies(session.id),
  ]);
  const occupiedOrdersByTable = Object.fromEntries(activeTableOrders);

  return (
    <div className="p-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-semibold">Table View</h1>
        <ReservationFormDialog
          mode="create"
          floors={floors.map((f) => ({
            id: f.id,
            name: f.name,
            tables: f.tables,
          }))}
          action={createReservation}
        />
      </div>
      <TableGrid
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
