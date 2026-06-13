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

export type FloorInput = z.infer<typeof floorSchema>;
export type TableInput = z.infer<typeof tableSchema>;
