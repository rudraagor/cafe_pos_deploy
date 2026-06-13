import { z } from "zod";

export const floorSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Floor name is required.")
    .max(80, "Floor name must be 80 characters or fewer."),
});

const tableNumberSchema = z
  .string()
  .trim()
  .transform((value) => value.replace(/^t\s*/i, ""))
  .refine((value) => value.length > 0, "Table number is required.")
  .refine((value) => /^\d+$/.test(value), "Use a number like 6 or T6.")
  .transform(Number)
  .pipe(
    z
      .number()
      .int("Table number must be a whole number.")
      .positive("Table number must be positive.")
      .max(999, "Table number is too high."),
  );

export const tableSchema = z.object({
  floorId: z.string().uuid("Select a valid floor."),
  number: tableNumberSchema,
  seats: z.coerce
    .number({ invalid_type_error: "Seat count is required." })
    .int("Seats must be a whole number.")
    .positive("Seats must be positive.")
    .max(50, "Seats cannot exceed 50."),
  active: z.boolean(),
});

export const reservationSchema = z.object({
  customerName: z
    .string()
    .trim()
    .min(1, "Customer name is required.")
    .max(120, "Customer name must be 120 characters or fewer."),
  customerEmail: z
    .string()
    .trim()
    .email("Enter a valid customer email.")
    .max(160, "Customer email must be 160 characters or fewer."),
  customerPhone: z
    .string()
    .trim()
    .max(40, "Phone must be 40 characters or fewer.")
    .optional(),
  partySize: z.coerce
    .number({ invalid_type_error: "Party size is required." })
    .int("Party size must be a whole number.")
    .positive("Party size must be positive.")
    .max(100, "Party size is too high."),
  startAt: z
    .string()
    .trim()
    .min(1, "Reservation time is required.")
    .transform((value) => new Date(value))
    .refine((value) => !Number.isNaN(value.getTime()), {
      message: "Reservation time is invalid.",
    }),
  durationMinutes: z.coerce
    .number({ invalid_type_error: "Duration is required." })
    .int("Duration must be a whole number.")
    .min(15, "Duration must be at least 15 minutes.")
    .max(480, "Duration cannot exceed 8 hours."),
  tableIds: z
    .array(z.string().uuid())
    .min(1, "Select at least one table for the reservation."),
  notes: z
    .string()
    .trim()
    .max(500, "Notes must be 500 characters or fewer.")
    .optional(),
});

export type FloorInput = z.infer<typeof floorSchema>;
export type TableInput = z.infer<typeof tableSchema>;
export type ReservationInput = z.infer<typeof reservationSchema>;
