import { z } from "zod";

/**
 * The shape every server action in the dashboard returns, so one client
 * component (`FormAlert`) can render the outcome of any of them and
 * `useActionState` always has the same state type.
 *
 * `fieldErrors` is keyed by input `name`, which is what lets a form show the
 * message next to the field rather than as one lump at the top.
 */
export type ActionState = {
  ok?: boolean;
  message?: string;
  /** Keyed by form field name. */
  fieldErrors?: Record<string, string>;
  /** Echoed back so a rejected form can repopulate instead of clearing itself. */
  values?: Record<string, string>;
};

export const IDLE: ActionState = {};

/**
 * Validates `FormData` against a schema and, on failure, returns the state a
 * form needs to re-render itself — errors per field *and* the values the person
 * typed. Losing a long "détails" textarea to a validation error on the title is
 * the single most annoying thing a form can do.
 */
export function parseForm<S extends z.ZodType<Record<string, unknown>>>(
  schema: S,
  formData: FormData,
): { ok: true; data: z.infer<S> } | { ok: false; state: ActionState } {
  const raw: Record<string, unknown> = {};
  const values: Record<string, string> = {};
  for (const [key, value] of formData.entries()) {
    if (typeof value !== "string") continue;
    // A multi-select posts the same name several times; collect those as arrays.
    if (key in raw) {
      const existing = raw[key];
      raw[key] = Array.isArray(existing) ? [...existing, value] : [existing, value];
    } else {
      raw[key] = value;
    }
    values[key] = value;
  }

  const parsed = schema.safeParse(raw);
  if (parsed.success) return { ok: true, data: parsed.data };

  const fieldErrors: Record<string, string> = {};
  for (const issue of parsed.error.issues) {
    const key = issue.path.join(".") || "_";
    fieldErrors[key] ??= issue.message;
  }
  return {
    ok: false,
    state: {
      ok: false,
      message: "Vérifiez les champs signalés.",
      fieldErrors,
      values,
    },
  };
}

export function fail(message: string, fieldErrors?: Record<string, string>): ActionState {
  return { ok: false, message, fieldErrors };
}

export function succeed(message: string): ActionState {
  return { ok: true, message };
}

/** Empty string → undefined, so an untouched optional input isn't stored as "". */
export const optionalText = z
  .string()
  .trim()
  .transform((v) => (v === "" ? undefined : v))
  .optional();

/** A checkbox posts "on" when ticked and nothing at all when not. */
export const checkbox = z
  .union([z.literal("on"), z.literal("true"), z.literal("")])
  .optional()
  .transform((v) => v === "on" || v === "true");
