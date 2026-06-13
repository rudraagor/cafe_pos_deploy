export type FieldErrors<TField extends string = string> = Partial<
  Record<TField, string[]>
>;

export type ActionResult<TField extends string = string> =
  | { ok: true; message?: string }
  | { ok: false; error: string; fieldErrors?: FieldErrors<TField> };
