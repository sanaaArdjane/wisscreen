/**
 * "One `Label : valeur` per line" — the editing format for the catalogue's
 * specs and quota grants.
 *
 * A textarea rather than a repeating-rows editor on purpose: a server's spec
 * and an SMS bundle's describe themselves with different words and different
 * numbers of lines, the admin types them like a note, and a textarea posts as
 * one plain field that needs no JavaScript. Both directions live here so the
 * form's default value and the parser agree.
 */

export function parseLines(text: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line) continue;
    const i = line.search(/[:=]/);
    if (i <= 0) continue;
    const key = line.slice(0, i).trim();
    const value = line.slice(i + 1).trim();
    if (key) out[key] = value;
  }
  return out;
}

export function formatLines(map: Record<string, string | number | null> | null | undefined): string {
  return Object.entries(map ?? {})
    .map(([k, v]) => `${k}: ${v === null ? "illimité" : v}`)
    .join("\n");
}

/**
 * Quota grants: `smtp.emails: 50000`, `ai.requests: illimité`.
 * Returns the map, or the first line it could not read.
 */
export function parseGrants(
  text: string,
): { ok: true; grants: Record<string, number | null> } | { ok: false; error: string } {
  const grants: Record<string, number | null> = {};
  for (const [metric, value] of Object.entries(parseLines(text))) {
    if (!/^[a-z0-9][a-z0-9._-]*$/i.test(metric)) {
      return { ok: false, error: `Métrique invalide : « ${metric} ».` };
    }
    if (/^(illimit[ée]|unlimited|∞)$/i.test(value)) {
      grants[metric] = null;
      continue;
    }
    const n = Number(value.replace(/[\s ]/g, ""));
    if (!Number.isInteger(n) || n < 0) {
      return { ok: false, error: `« ${metric} » : un entier positif ou « illimité ».` };
    }
    grants[metric] = n;
  }
  return { ok: true, grants };
}

export function listLines(text: string): string[] {
  return text
    .split(/\r?\n/)
    .map((l) => l.replace(/^[-*•]\s*/, "").trim())
    .filter(Boolean);
}
