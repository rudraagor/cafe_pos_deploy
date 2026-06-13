import { z } from "zod";

function optionalEmail() {
  return z.preprocess(
    (value) => (value == null ? "" : String(value).trim()),
    z.union([
      z.literal("").transform(() => null),
      z.string().email("Enter a valid email.").max(200),
    ]),
  );
}

function optionalPhone() {
  return z.preprocess(
    (value) => (value == null ? "" : String(value).trim()),
    z.union([
      z.literal("").transform(() => null),
      z.string().max(20, "Phone must be 20 characters or fewer."),
    ]),
  );
}

export const customerSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Customer name is required.")
    .max(120, "Name must be 120 characters or fewer."),
  email: optionalEmail(),
  phone: optionalPhone(),
});

export type CustomerInput = z.infer<typeof customerSchema>;
