export const modifierPresets = [
  { id: "jain", label: "Jain", noteAllowed: false },
  { id: "swaminarayan", label: "Swaminarayan", noteAllowed: false },
  { id: "less_sugar", label: "Less sugar", noteAllowed: false },
  { id: "no_ice", label: "No ice", noteAllowed: false },
  { id: "allergen_note", label: "Allergen note", noteAllowed: true },
  { id: "custom_note", label: "Custom note", noteAllowed: true },
] as const;

export type ModifierId = (typeof modifierPresets)[number]["id"];

export const modifierIds = modifierPresets.map((preset) => preset.id) as [
  ModifierId,
  ...ModifierId[],
];

export function modifierLabel(id: string) {
  return modifierPresets.find((preset) => preset.id === id)?.label ?? id;
}

export function normalizeModifiers(value: unknown): ModifierId[] {
  if (!Array.isArray(value)) return [];
  const allowed = new Set<string>(modifierIds);
  return [
    ...new Set(value.filter((item) => allowed.has(String(item)))),
  ].sort() as ModifierId[];
}

export function modifiersAllowNote(modifiers: readonly string[]) {
  return modifiers.some(
    (id) => modifierPresets.find((preset) => preset.id === id)?.noteAllowed,
  );
}
