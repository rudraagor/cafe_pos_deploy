import { z } from "zod";

export const categoryPalette = [
  "#7c4a2d",
  "#2f855a",
  "#d69e2e",
  "#3182ce",
  "#9f7aea",
  "#dd6b20",
  "#0f766e",
  "#e11d48",
];

export const categorySchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Category name is required.")
    .max(80, "Category name must be 80 characters or fewer."),
  color: z
    .string()
    .trim()
    .regex(/^#[0-9a-fA-F]{6}$/, "Use a valid hex color."),
});

export type CategoryInput = z.infer<typeof categorySchema>;
