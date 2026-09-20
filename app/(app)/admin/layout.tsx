import { AppShell } from "@/components/dashboard/AppShell";
import { ADMIN_NAV } from "@/components/dashboard/nav";
import { isImpersonating, requireStaff } from "@/lib/guard";
import { unreadCount } from "@/lib/account";
import { getSetting } from "@/lib/settings";
import { can } from "@/lib/permissions";

/**
 * The admin shell. `requireStaff()` opens the door; each page then calls
 * `requirePermission()` for its own capability, because "can see the admin area"
 * and "can edit invoices" are different questions and a staff member can have
 * one without the other.
 *
 * The sidebar is filtered by the same `can()` the pages use, so a revoked
 * capability removes the link rather than leaving one that bounces to
 * /acces-refuse.
 */
export default async function AdminLayout({ children }: LayoutProps<"/admin">) {
  const user = await requireStaff();

  const [unread, announcement, impersonating] = await Promise.all([
    unreadCount(user.id),
    getSetting("announcement"),
    isImpersonating(),
  ]);

  const nav = ADMIN_NAV.filter((item) => !item.permission || can(user, item.permission));

  return (
    <AppShell
      area="admin"
      nav={nav}
      user={{ name: user.name, email: user.email, image: user.image, role: user.role }}
      unread={unread}
      announcement={announcement || undefined}
      impersonating={impersonating}
    >
      {children}
    </AppShell>
  );
}
