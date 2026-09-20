import type { IconName } from "@/lib/types";
import type { PermissionKey } from "@/lib/permissions";

/**
 * Both sidebars, as data.
 *
 * The admin side carries the capability each entry needs; the shell filters the
 * list with `can()` before rendering, so a staff member whose `invoices:read`
 * was revoked doesn't see a link that would only redirect them to /acces-refuse.
 * The pages themselves still call `requirePermission` — this is navigation, not
 * enforcement.
 */

export type NavItem = {
  href: string;
  label: string;
  icon: IconName;
  /** Only for admin items; a client entry is gated by being signed in. */
  permission?: PermissionKey;
  /** Match child routes too (`/dashboard/demandes/12` highlights "Demandes"). */
  prefix?: boolean;
};

export const CLIENT_NAV: NavItem[] = [
  { href: "/dashboard", label: "Vue d'ensemble", icon: "home" },
  { href: "/dashboard/demandes", label: "Mes demandes", icon: "inbox", prefix: true },
  { href: "/dashboard/demos", label: "Essayer nos solutions", icon: "zap", prefix: true },
  { href: "/dashboard/abonnement", label: "Abonnement & quotas", icon: "credit-card" },
  { href: "/dashboard/devis", label: "Devis", icon: "file-text", prefix: true },
  { href: "/dashboard/factures", label: "Factures", icon: "receipt", prefix: true },
  { href: "/dashboard/documents", label: "Documents", icon: "database" },
  { href: "/dashboard/notifications", label: "Notifications", icon: "bell" },
  { href: "/dashboard/profil", label: "Mon profil", icon: "users" },
];

export const ADMIN_NAV: NavItem[] = [
  { href: "/admin", label: "Vue d'ensemble", icon: "home" },
  {
    href: "/admin/demandes",
    label: "Demandes",
    icon: "inbox",
    permission: "requests:read",
    prefix: true,
  },
  {
    href: "/admin/utilisateurs",
    label: "Utilisateurs",
    icon: "users",
    permission: "users:read",
    prefix: true,
  },
  {
    href: "/admin/devis",
    label: "Devis",
    icon: "file-text",
    permission: "quotes:read",
    prefix: true,
  },
  {
    href: "/admin/factures",
    label: "Factures",
    icon: "receipt",
    permission: "invoices:read",
    prefix: true,
  },
  {
    href: "/admin/abonnements",
    label: "Abonnements & quotas",
    icon: "credit-card",
    permission: "subscriptions:read",
  },
  // No permission: everyone with a back-office account has a feed of their own.
  // The *composer* behind it is what needs `notifications:write`.
  { href: "/admin/notifications", label: "Notifications", icon: "bell", prefix: true },
  { href: "/admin/demos", label: "Démos", icon: "zap", permission: "demos:read" },
  { href: "/admin/messages", label: "Messages du site", icon: "mail", permission: "leads:read" },
  { href: "/admin/equipe", label: "Équipe & accès", icon: "shield", permission: "team:read" },
  {
    href: "/admin/journal",
    label: "Journal d'activité",
    icon: "activity",
    permission: "activity:read",
  },
  { href: "/admin/parametres", label: "Paramètres", icon: "settings", permission: "settings:read" },
  // Same account, same sidebar: a staff member changes their own password and
  // reviews their devices here rather than crossing into a client space they
  // have no use for. To see what a client sees, impersonate them.
  { href: "/admin/profil", label: "Mon profil", icon: "users" },
];

export function isActive(pathname: string, item: NavItem): boolean {
  return item.prefix ? pathname === item.href || pathname.startsWith(`${item.href}/`) : pathname === item.href;
}
