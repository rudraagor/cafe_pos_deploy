import { requireUser } from "@/lib/auth";
import { TableGrid } from "@/components/pos/table-grid";
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
      <h1 className="mb-4 text-xl font-semibold">Table View</h1>
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
