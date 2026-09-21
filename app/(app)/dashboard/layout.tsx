import { AppShell } from "@/components/dashboard/AppShell";
import { CLIENT_NAV } from "@/components/dashboard/nav";
import { isImpersonating, requireUser } from "@/lib/guard";
import { isStaff } from "@/lib/permissions";
import { redirect } from "next/navigation";
import { ensureProvisioned, unreadCount } from "@/lib/account";
import { getSetting } from "@/lib/settings";
import { getTheme } from "@/lib/theme-server";

/**
 * Every client-dashboard page renders inside this, so the session check happens
 * once rather than in each page. `requireUser()` hits the database — a revoked
 * session or a fresh ban stops working on the next navigation, not at the next
 * cookie expiry.
 *
 * `ensureProvisioned` is here for the same reason: it's the first authenticated
 * touchpoint after sign-up, and doing it on a real page load rather than in an
 * auth hook means a hiccup shows up as a dashboard error the person can retry,
 * not as a failed registration.
 */
export default async function DashboardLayout({ children }: LayoutProps<"/dashboard">) {
  const user = await requireUser("/dashboard");

  /**
   * Staff and admins have one dashboard, and it is `/admin`. An account that runs
   * the desk is not also a customer of it — its client space showed "0 demandes"
   * and a Découverte plan it will never use, and two sidebars for one person is
   * two mental models for one job.
   *
   * This does **not** block impersonation: `getSession` returns the *impersonated*
   * user during it, whose role is `user`, so the check passes and the admin sees
   * the real client space — which is the supported way to look at it.
   */
  if (isStaff(user)) redirect("/admin");

  await ensureProvisioned(user.id);

  const [unread, announcement, impersonating, theme] = await Promise.all([
    unreadCount(user.id),
    getSetting("announcement"),
    isImpersonating(),
    getTheme(),
  ]);

  return (
    <AppShell
      area="client"
      nav={CLIENT_NAV}
      user={{ name: user.name, email: user.email, image: user.image, role: user.role }}
      unread={unread}
      announcement={announcement || undefined}
      impersonating={impersonating}
      theme={theme}
    >
      {children}
    </AppShell>
  );
}
