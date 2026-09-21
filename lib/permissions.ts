/**
 * Who can do what.
 *
 * Two layers, in this order:
 *
 *  1. **The role** — `user`, `staff` or `admin` — gives a default set of keys.
 *  2. **The account's own `permissions` jsonb** overrides individual keys, either
 *     way: `{ "invoices:write": true }` grants, `{ "leads:read": false }` revokes.
 *
 * That second layer is the whole point. The admin asked to be able to hand a
 * staff member any single capability, and take it back, without a new role
 * existing for every combination — so a role is a starting point, not a cage.
 *
 * A key is `"<domain>:<action>"`. Nothing reads `role === "admin"` directly
 * anywhere else in the app; every gate goes through `can()`, which is why
 * `lib/guard.ts` is the only file that ever has to change if this grows.
 */

export const DOMAINS = [
  "users",
  "team",
  "requests",
  "quotes",
  "invoices",
  "subscriptions",
  "notifications",
  "demos",
  "leads",
  "settings",
  "activity",
  /** The public marketing site: its copy, media and solutions (/admin/site). */
  "site",
] as const;

export type Domain = (typeof DOMAINS)[number];
export type Action = "read" | "write" | "delete";
export type PermissionKey = `${Domain}:${Action}`;

export const ROLES = ["user", "staff", "admin"] as const;
export type Role = (typeof ROLES)[number];

/** Every key that exists, in the order the admin permission matrix renders them. */
export const ALL_PERMISSIONS: PermissionKey[] = DOMAINS.flatMap(
  (d) => (["read", "write", "delete"] as const).map((a) => `${d}:${a}` as PermissionKey),
);

/** French labels for the admin permission matrix. */
export const DOMAIN_LABELS: Record<Domain, string> = {
  users: "Utilisateurs",
  team: "Équipe & rôles",
  requests: "Demandes",
  quotes: "Devis",
  invoices: "Factures",
  subscriptions: "Abonnements & quotas",
  notifications: "Notifications",
  demos: "Démos",
  leads: "Messages du site",
  settings: "Paramètres",
  activity: "Journal d'activité",
  site: "Site public",
};

export const ACTION_LABELS: Record<Action, string> = {
  read: "Consulter",
  write: "Modifier",
  delete: "Supprimer",
};

/**
 * `staff` defaults: can run the day-to-day desk — read everything operational,
 * answer and move requests, draft quotes and invoices — but cannot touch other
 * accounts' roles, platform settings, or delete anything. Those are the three
 * things that are hard to undo, so they start off and are granted per person.
 */
const STAFF_DEFAULTS: PermissionKey[] = [
  "users:read",
  "requests:read",
  "requests:write",
  "quotes:read",
  "quotes:write",
  "invoices:read",
  "invoices:write",
  "subscriptions:read",
  "notifications:read",
  "notifications:write",
  "demos:read",
  "leads:read",
  "leads:write",
  "activity:read",
];

/** A plain client account: the dashboard's own pages check ownership, not these. */
const USER_DEFAULTS: PermissionKey[] = [];

const ROLE_DEFAULTS: Record<Role, PermissionKey[] | "all"> = {
  admin: "all",
  staff: STAFF_DEFAULTS,
  user: USER_DEFAULTS,
};

export type Principal = {
  role?: string | null;
  permissions?: Record<string, boolean> | null;
  banned?: boolean | null;
};

function isRole(value: unknown): value is Role {
  return typeof value === "string" && (ROLES as readonly string[]).includes(value);
}

/**
 * The single authorization question. A banned account can do nothing, whatever
 * its role says — Better Auth already refuses it a session, and this is the
 * second line for a session minted before the ban landed.
 */
export function can(principal: Principal | null | undefined, key: PermissionKey): boolean {
  if (!principal) return false;
  if (principal.banned) return false;

  const override = principal.permissions?.[key];
  if (typeof override === "boolean") return override;

  const role: Role = isRole(principal.role) ? principal.role : "user";
  const defaults = ROLE_DEFAULTS[role];
  return defaults === "all" ? true : defaults.includes(key);
}

/** Does this account see the admin area at all? */
export function isStaff(principal: Principal | null | undefined): boolean {
  if (!principal || principal.banned) return false;
  if (principal.role === "admin" || principal.role === "staff") return true;
  // A plain user handed a single admin-area capability still needs the door open.
  return ALL_PERMISSIONS.some((k) => principal.permissions?.[k] === true);
}

/** The effective set, for rendering the admin permission matrix with its checkboxes. */
export function effectivePermissions(principal: Principal): Record<PermissionKey, boolean> {
  return Object.fromEntries(ALL_PERMISSIONS.map((k) => [k, can(principal, k)])) as Record<
    PermissionKey,
    boolean
  >;
}

/** Is this key the role's default, i.e. is an override actually doing something? */
export function isRoleDefault(role: string | null | undefined, key: PermissionKey): boolean {
  const r: Role = isRole(role) ? role : "user";
  const defaults = ROLE_DEFAULTS[r];
  return defaults === "all" ? true : defaults.includes(key);
}
