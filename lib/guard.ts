import { headers } from "next/headers";
import { redirect, notFound } from "next/navigation";
import { auth, type Session, type SessionUser } from "@/lib/auth";
import { can, isStaff, type PermissionKey } from "@/lib/permissions";

/**
 * The only place a page or a server action asks "who is this, and may they?".
 *
 * Every one of these hits the database — `getSession` validates the session row,
 * it does not just read a cookie. `proxy.ts` does the cheap cookie check to keep
 * anonymous traffic off these routes; this is the check that actually decides.
 * Don't replace it with the cookie read: a session revoked from /admin, or an
 * account suspended a minute ago, has to stop working immediately.
 */

export async function getCurrentSession(): Promise<Session | null> {
  return auth.api.getSession({ headers: await headers() });
}

export async function getCurrentUser(): Promise<SessionUser | null> {
  const session = await getCurrentSession();
  return session?.user ?? null;
}

/**
 * True while an admin is browsing as somebody else. The flag lives on the
 * *session* row, not the user, so it can't be read off `requireUser()` — the
 * shell needs the session to know whether to show the "revenir à mon compte"
 * bar.
 */
export async function isImpersonating(): Promise<boolean> {
  const session = await getCurrentSession();
  return Boolean(session?.session.impersonatedBy);
}

/** For a page behind /dashboard or /admin. Sends anonymous visitors to sign-in. */
export async function requireUser(returnTo?: string): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) {
    redirect(returnTo ? `/connexion?next=${encodeURIComponent(returnTo)}` : "/connexion");
  }
  if (user.banned) redirect("/compte-suspendu");
  return user;
}

/** Anyone who should see the /admin shell at all. */
export async function requireStaff(): Promise<SessionUser> {
  const user = await requireUser("/admin");
  if (!isStaff(user)) redirect("/acces-refuse");
  return user;
}

/**
 * A specific capability.
 *
 * Denial is a redirect to `/acces-refuse`, not Next's `forbidden()`: that helper
 * is still behind the experimental `authInterrupts` flag, and a real page costs
 * nothing and says which capability is missing.
 */
export async function requirePermission(key: PermissionKey): Promise<SessionUser> {
  const user = await requireUser("/admin");
  if (!can(user, key)) redirect(`/acces-refuse?perm=${encodeURIComponent(key)}`);
  return user;
}

/**
 * Row-level ownership for the client dashboard: a record belongs to the signed-in
 * user, or they have the staff capability to see anyone's.
 *
 * `notFound()` rather than a 403 on purpose — answering "accès refusé" to
 * /dashboard/demandes/9999 tells a stranger that request 9999 exists.
 */
export function assertOwnerOrPermission(
  user: SessionUser,
  ownerId: string | null | undefined,
  key: PermissionKey,
): void {
  if (ownerId && ownerId === user.id) return;
  if (can(user, key)) return;
  notFound();
}

/** The non-throwing form, for conditionally rendering a control. */
export function allowed(user: SessionUser | null, key: PermissionKey): boolean {
  return can(user, key);
}
