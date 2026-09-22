/**
 * What counts as a strong password, in one place.
 *
 * The rules are data, not a regex buried in a validator, because three callers need
 * them and two of them need the *list*:
 *
 *  - `components/auth/AuthForms.tsx` renders it as a live checklist and keeps the
 *    sign-up button disabled until every rule passes;
 *  - `lib/auth.ts` re-checks on the server, because a disabled button is not
 *    authorization — `/sign-up/email` and `/reset-password` are public endpoints;
 *  - `app/(app)/admin/utilisateurs/actions.ts` generates a password when an admin
 *    leaves the field blank, and that password has to satisfy the same rules or the
 *    server would refuse the account the admin just asked for. Hence `generatePassword`
 *    lives here too, next to what it must satisfy.
 *
 * The length floor is 10, matching `emailAndPassword.minPasswordLength` in `lib/auth.ts`.
 * Raise both together or Better Auth's own error fires first with a different message.
 */

export type PasswordRule = {
  id: string;
  /** French, shown verbatim in the checklist. */
  label: string;
  test: (password: string) => boolean;
};

export const PASSWORD_RULES: PasswordRule[] = [
  { id: "length", label: "10 caractères minimum", test: (p) => p.length >= 10 },
  { id: "lower", label: "Une lettre minuscule", test: (p) => /[a-z]/.test(p) },
  { id: "upper", label: "Une lettre majuscule", test: (p) => /[A-Z]/.test(p) },
  { id: "digit", label: "Un chiffre", test: (p) => /\d/.test(p) },
  { id: "symbol", label: "Un caractère spécial", test: (p) => /[^A-Za-z0-9]/.test(p) },
];

/** Every rule with its current verdict — what the checklist renders. */
export function checkPassword(password: string): { rule: PasswordRule; ok: boolean }[] {
  return PASSWORD_RULES.map((rule) => ({ rule, ok: rule.test(password) }));
}

export function isStrongPassword(password: string): boolean {
  return PASSWORD_RULES.every((rule) => rule.test(password));
}

/** The first unmet rule, as a sentence — the server's error message. */
export function passwordProblem(password: string): string | null {
  const failed = PASSWORD_RULES.filter((rule) => !rule.test(password));
  if (failed.length === 0) return null;
  return `Mot de passe trop faible. Il lui manque : ${failed
    .map((r) => r.label.toLowerCase())
    .join(", ")}.`;
}

/*
 * The generator. `crypto.getRandomValues` rather than `Math.random`, and available in
 * both runtimes this is called from (the browser, and Node 22's global `crypto`).
 *
 * Ambiguous glyphs are left out of every set: these passwords get read aloud over the
 * phone by an admin opening an account for a client, so `O`/`0`, `l`/`1`/`I` and `|`
 * cost more than the handful of bits they add. 18 characters from these sets is ~100
 * bits, which is far past anything the length floor is protecting.
 */
const SETS = [
  "abcdefghijkmnpqrstuvwxyz",
  "ABCDEFGHJKLMNPQRSTUVWXYZ",
  "23456789",
  "!@#$%&*?+-=",
];

function pick(set: string, n: number): string[] {
  const bytes = new Uint32Array(n);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => set[b % set.length]);
}

export function generatePassword(length = 18): string {
  // One character from each set first, so the result satisfies every rule by
  // construction rather than by chance — a rejection loop would be the other way to
  // do it, and it can in principle never terminate.
  const chars = SETS.map((set) => pick(set, 1)[0]);
  chars.push(...pick(SETS.join(""), Math.max(0, length - SETS.length)));

  // Fisher-Yates, so the guaranteed characters aren't always the first four.
  const swaps = new Uint32Array(chars.length);
  crypto.getRandomValues(swaps);
  for (let i = chars.length - 1; i > 0; i--) {
    const j = swaps[i] % (i + 1);
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }
  return chars.join("");
}
