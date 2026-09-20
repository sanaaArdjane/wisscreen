/**
 * Broadcast audiences.
 *
 * A plain module rather than part of `actions.ts`: a `"use server"` file may
 * only export async functions, so a shared constant that both the action and
 * the page need has to live outside it.
 */
export const SEGMENTS = [
  { value: "tous", label: "Tous les comptes actifs" },
  { value: "clients", label: "Clients uniquement" },
  { value: "equipe", label: "Équipe et administrateurs" },
  { value: "nouveaux", label: "Inscrits des 30 derniers jours" },
  { value: "plan", label: "Une formule précise" },
] as const;

export const SEGMENT_VALUES = SEGMENTS.map((s) => s.value) as unknown as [string, ...string[]];
