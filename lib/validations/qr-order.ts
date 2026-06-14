import { z } from "zod";
import { modifierIds } from "@/lib/pos/modifiers";

export const qrOrderItemSchema = z.object({
  productId: z.string().uuid(),
  qty: z.number().int().min(1).max(20),
  modifiers: z.array(z.enum(modifierIds)).default([]),
  note: z.string().trim().max(160).optional(),
});

export const qrOrderPayloadSchema = z.object({
  token: z.string().min(1),
  customerName: z.string().trim().min(1, "Name is required.").max(80),
  customerEmail: z.string().trim().email("Enter a valid email.").max(120),
  items: z.array(qrOrderItemSchema).min(1).max(30),
});

export type QrOrderPayload = z.infer<typeof qrOrderPayloadSchema>;
