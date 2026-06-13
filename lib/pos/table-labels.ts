export type TableLabelInput = {
  number: number;
  floor?: { name: string } | null;
};

export function formatTableLabel(table: TableLabelInput) {
  return `${table.floor?.name ? `${table.floor.name} / ` : ""}T${table.number}`;
}

export function formatMergedTableLabel(tables: TableLabelInput[]) {
  if (tables.length === 0) return "Takeaway";
  return tables.map(formatTableLabel).join(" + ");
}
