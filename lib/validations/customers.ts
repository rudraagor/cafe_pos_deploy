import { z } from "zod";

export const customerSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Customer name is required.")
    .max(120, "Name must be 120 characters or fewer."),
  email: z
    .string()
    .trim()
    .email("Enter a valid email.")
    .max(200)
    .optional()
    .or(z.literal(""))
    .transform((v) => v || null),
  phone: z
    .string()
    .trim()
    .max(20, "Phone must be 20 characters or fewer.")
    .optional()
    .or(z.literal(""))
    .transform((v) => v || null),
});

export type CustomerInput = z.infer<typeof customerSchema>;
