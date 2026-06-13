import { z } from "zod";

export const floorSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Floor name is required.")
    .max(80, "Floor name must be 80 characters or fewer."),
});

export const tableSchema = z.object({
  floorId: z.string().uuid("Select a valid floor."),
  number: z.coerce
    .number({ invalid_type_error: "Table number is required." })
    .int("Table number must be a whole number.")
    .positive("Table number must be positive.")
    .max(999, "Table number is too high."),
  seats: z.coerce
    .number({ invalid_type_error: "Seat count is required." })
    .int("Seats must be a whole number.")
    .positive("Seats must be positive.")
    .max(50, "Seats cannot exceed 50."),
  active: z.boolean(),
});

export type FloorInput = z.infer<typeof floorSchema>;
export type TableInput = z.infer<typeof tableSchema>;
