"use client";

import { Armchair, Loader2, UserCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";
import { DeleteButton } from "@/components/admin/delete-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatReportDateTime } from "@/lib/reports/range";
import {
  cancelReservation,
  createReservation,
  createTable,
  deleteFloor,
  deleteTable,
  seatReservation,
  updateFloor,
  updateReservation,
  updateTable,
} from "./actions";
import { FloorFormDialog } from "./floor-form-dialog";
import {
  TableFormDialog,
  type FloorOption,
  type TableFormValue,
} from "./table-form-dialog";
import {
  ReservationFormDialog,
  type ReservationFormValue,
} from "./reservation-form-dialog";

export type BookingFloor = FloorOption & {
  tables: Array<{
    id: string;
    number: number;
    seats: number;
    active: boolean;
  }>;
};

export type BookingReservation = {
  id: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string | null;
  partySize: number;
  startAt: string;
  durationMinutes: number;
  status: "booked" | "seated" | "expired" | "cancelled";
  notes: string | null;
  tableIds: string[];
  tableLabel: string;
};

type BookingManagementProps = {
  floors: BookingFloor[];
  reservations: BookingReservation[];
};

export function BookingManagement({
  floors,
  reservations,
}: BookingManagementProps) {
  const floorOptions: FloorOption[] = floors.map(({ id, name }) => ({
    id,
    name,
  }));

  if (floors.length === 0) {
    return (
      <div className="flex min-h-52 flex-col items-center justify-center gap-3 rounded-lg border border-dashed p-8 text-center">
        <Armchair className="text-muted-foreground size-8" />
        <div>
          <p className="font-medium">No floors yet</p>
          <p className="text-muted-foreground text-sm">
            Add a floor first, then place tables inside it.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <section className="space-y-3 rounded-lg border p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold">Reservations</h2>
            <p className="text-muted-foreground text-sm">
              Customer bookings that can block POS table selection.
            </p>
          </div>
          <ReservationFormDialog
            mode="create"
            floors={floors}
            action={createReservation}
          />
        </div>
        {reservations.length === 0 ? (
          <div className="text-muted-foreground rounded-lg border border-dashed p-4 text-sm">
            No reservations yet.
          </div>
        ) : (
          <div className="grid gap-3 lg:grid-cols-2">
            {reservations.map((reservation) => {
              const value: ReservationFormValue = {
                customerName: reservation.customerName,
                customerEmail: reservation.customerEmail,
                customerPhone: reservation.customerPhone ?? "",
                partySize: String(reservation.partySize),
                startAt: toDateTimeLocal(reservation.startAt),
                durationMinutes: String(reservation.durationMinutes),
                tableIds: reservation.tableIds,
                notes: reservation.notes ?? "",
              };
              return (
                <div
                  key={reservation.id}
                  className="bg-card rounded-lg border p-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold">{reservation.customerName}</p>
                      <p className="text-muted-foreground text-sm">
                        {reservation.tableLabel} · {reservation.partySize} guests
                      </p>
                      <p className="text-muted-foreground text-sm">
                        {formatReportDateTime(reservation.startAt)} ·{" "}
                        {reservation.durationMinutes} min
                      </p>
                    </div>
                    <Badge
                      variant={
                        reservation.status === "booked"
                          ? "secondary"
                          : "outline"
                      }
                    >
                      {reservation.status}
                    </Badge>
                  </div>
                  <div className="mt-3 flex flex-wrap justify-end gap-1">
                    {reservation.status === "booked" ? (
                      <>
                        <SeatReservationButton reservationId={reservation.id} />
                        <ReservationFormDialog
                          mode="edit"
                          floors={floors}
                          reservation={value}
                          action={updateReservation.bind(null, reservation.id)}
                        />
                        <DeleteButton
                          itemName={`${reservation.customerName}'s reservation`}
                          title="Cancel reservation?"
                          description="The reservation will be cancelled and its tables freed."
                          action={cancelReservation.bind(null, reservation.id)}
                        />
                      </>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {floors.map((floor) => (
        <section key={floor.id} className="space-y-3 rounded-lg border p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold">{floor.name}</h2>
              <p className="text-muted-foreground text-sm">
                {floor.tables.length} table
                {floor.tables.length === 1 ? "" : "s"}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <TableFormDialog
                mode="create"
                floors={floorOptions}
                table={{
                  floorId: floor.id,
                  number: "",
                  seats: "4",
                  active: true,
                }}
                action={createTable}
              />
              <FloorFormDialog
                mode="edit"
                floor={{ name: floor.name }}
                action={updateFloor.bind(null, floor.id)}
              />
              <DeleteButton
                itemName={floor.name}
                title="Delete floor?"
                description={`${floor.name} and all of its tables will be removed.`}
                action={deleteFloor.bind(null, floor.id)}
              />
            </div>
          </div>

          {floor.tables.length === 0 ? (
            <div className="text-muted-foreground rounded-lg border border-dashed p-4 text-sm">
              No tables on this floor yet.
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {floor.tables.map((table) => {
                const tableValue: TableFormValue = {
                  floorId: floor.id,
                  number: String(table.number),
                  seats: String(table.seats),
                  active: table.active,
                };

                return (
                  <div
                    key={table.id}
                    className="bg-card flex min-h-32 flex-col justify-between rounded-lg border p-3"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-2xl font-semibold tabular-nums">
                          T{table.number}
                        </p>
                        <p className="text-muted-foreground text-sm">
                          {table.seats} seats
                        </p>
                      </div>
                      <Badge variant={table.active ? "secondary" : "outline"}>
                        {table.active ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                    <div className="mt-3 flex justify-end gap-1">
                      <TableFormDialog
                        mode="edit"
                        floors={floorOptions}
                        table={tableValue}
                        action={updateTable.bind(null, table.id)}
                      />
                      <DeleteButton
                        itemName={`T${table.number}`}
                        title="Delete table?"
                        description={`Table ${table.number} will be removed from ${floor.name}.`}
                        action={deleteTable.bind(null, table.id)}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      ))}
    </div>
  );
}

function toDateTimeLocal(value: string) {
  const date = new Date(value);
  const pad = (part: number) => String(part).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function SeatReservationButton({ reservationId }: { reservationId: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleSeat() {
    startTransition(async () => {
      const result = await seatReservation(reservationId);
      if (result.ok && result.href) {
        router.push(result.href);
        return;
      }
      toast.error(result.ok ? "Could not seat reservation." : result.error);
    });
  }

  return (
    <Button
      type="button"
      size="sm"
      variant="outline"
      onClick={handleSeat}
      disabled={isPending}
    >
      {isPending ? (
        <Loader2 className="size-4 animate-spin" />
      ) : (
        <UserCheck className="size-4" />
      )}
      Seat
    </Button>
  );
}
