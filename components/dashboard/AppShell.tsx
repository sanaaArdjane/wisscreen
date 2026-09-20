"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { cn } from "@/lib/cn";
import { authClient } from "@/lib/auth-client";
import { isActive, type NavItem } from "@/components/dashboard/nav";

/**
 * The frame both dashboards share: a fixed sidebar on `lg`, a slide-over drawer
 * below it, and a top bar carrying the page title, the notification bell and the
 * account menu.
 *
 * It is a client component because it needs the pathname, the drawer state and
 * the sign-out call — but everything *inside* it stays a server component: the
 * pages are passed as `children`, so none of the data fetching gets dragged into
 * the client bundle by the shell.
 *
 * `data-wicloud-app` on the root is what scopes HeroUI's theming (see
 * `app/(app)/heroui.css`); without it the dashboard renders in HeroUI's own
 * default palette instead of the brand's.
 */

export type ShellUser = {
  name: string;
  email: string;
  image?: string | null;
  role?: string | null;
};

export function AppShell({
  nav,
  user,
  area,
  unread,
  announcement,
  impersonating,
  children,
}: {
  nav: NavItem[];
  user: ShellUser;
  /** Which dashboard this is — drives the badge and the cross-link. */
  area: "client" | "admin";
  unread: number;
  announcement?: string;
  /** Set while an admin is viewing the app as someone else. */
  impersonating?: boolean;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);

  // The drawer closes on the click that navigates, not in an effect watching the
  // pathname. Tapping a link on a phone must not leave the drawer covering the
  // page you just asked for — and setting state from an effect to achieve that
  // is a cascading render React's own lint rule rejects.
  const close = () => setOpen(false);

  async function signOut() {
    await authClient.signOut();
    router.push("/");
    router.refresh();
  }

  async function stopImpersonating() {
    await authClient.admin.stopImpersonating();
    router.push("/admin/utilisateurs");
    router.refresh();
  }

  const home = area === "admin" ? "/admin" : "/dashboard";

  return (
    <div data-wicloud-app className="min-h-dvh bg-mist text-ink">
      {impersonating && (
        <div className="flex flex-wrap items-center justify-center gap-3 bg-ink px-4 py-2 text-center text-sm text-paper">
          <span>Vous consultez la plateforme en tant que {user.name}.</span>
          <button
            type="button"
            onClick={stopImpersonating}
            className="rounded-full border border-paper/40 px-3 py-0.5 text-xs font-medium hover:bg-paper/10"
          >
            Revenir à mon compte
          </button>
        </div>
      )}

      {/* Full-bleed on purpose. This row used to be `mx-auto max-w-[100rem]`,
          which centred the *whole shell* — so on any viewport wider than 1600px
          the sidebar stopped short of the left edge and left a mist gutter beside
          it (160px each side at 1920). A navigation rail has to reach the edge of
          the screen; the width cap belongs on the content, not on the chrome. */}
      <div className="flex w-full">
        {/* ── Sidebar ─────────────────────────────────────────────────────── */}
        <aside
          className={cn(
            "fixed inset-y-0 left-0 z-50 flex w-72 flex-col border-r border-ink/10 bg-ink text-paper transition-transform duration-300 ease-out lg:sticky lg:top-0 lg:h-dvh lg:translate-x-0",
            open ? "translate-x-0" : "-translate-x-full",
          )}
        >
          <div className="flex items-center justify-between px-5 py-5">
            <Link href={home} className="text-lg font-semibold tracking-tight">
              WI<span className="text-signal-soft">CLOUD</span>
            </Link>
            <button
              type="button"
              onClick={close}
              className="rounded-lg p-1.5 hover:bg-paper/10 lg:hidden"
              aria-label="Fermer le menu"
            >
              <Icon name="close" className="size-5" />
            </button>
          </div>

          <p className="px-5 pb-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-signal-soft">
            {area === "admin" ? "Administration" : "Espace client"}
          </p>

          <nav className="flex-1 overflow-y-auto px-3 pb-4">
            <ul className="flex flex-col gap-0.5">
              {nav.map((item) => {
                const active = isActive(pathname, item);
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      onClick={close}
                      aria-current={active ? "page" : undefined}
                      className={cn(
                        "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors",
                        active
                          ? "bg-paper/12 font-medium text-paper"
                          : "text-steel-pale hover:bg-paper/8 hover:text-paper",
                      )}
                    >
                      <Icon name={item.icon} className="size-[18px] shrink-0" />
                      <span className="truncate">{item.label}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>

          <div className="border-t border-paper/10 px-3 py-3">
            {/* One sidebar per account, and no "switch to my other dashboard".
                A staff member has no client space of their own — `Mon profil` is
                in the nav above, and seeing what a client sees is what
                impersonation is for. */}
            <ShellLink href="/" icon="external" label="Retour au site" onNavigate={close} />
            <button
              type="button"
              onClick={signOut}
              className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-steel-pale transition-colors hover:bg-paper/8 hover:text-paper"
            >
              <Icon name="log-out" className="size-[18px]" />
              Se déconnecter
            </button>
          </div>
        </aside>

        {/* Backdrop for the drawer. `lg:hidden` so it can never block the desktop
            layout if the state is somehow left open across a resize. */}
        {open && (
          <button
            type="button"
            aria-label="Fermer le menu"
            onClick={close}
            className="fixed inset-0 z-40 bg-abyss/50 lg:hidden"
          />
        )}

        {/* ── Content ─────────────────────────────────────────────────────── */}
        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-ink/10 bg-paper/85 px-4 py-3 backdrop-blur-md sm:px-6">
            <button
              type="button"
              onClick={() => setOpen(true)}
              className="rounded-lg p-2 text-ink hover:bg-ink/5 lg:hidden"
              aria-label="Ouvrir le menu"
            >
              <Icon name="menu" className="size-5" />
            </button>

            <div className="flex-1" />

            <Link
              href={area === "admin" ? "/admin/notifications" : "/dashboard/notifications"}
              className="relative rounded-lg p-2 text-ink hover:bg-ink/5"
              aria-label={
                unread > 0 ? `Notifications (${unread} non lues)` : "Notifications"
              }
            >
              <Icon name="bell" className="size-5" />
              {unread > 0 && (
                <span className="absolute -right-0.5 -top-0.5 flex min-w-[18px] items-center justify-center rounded-full bg-signal px-1 text-[10px] font-semibold text-abyss">
                  {unread > 99 ? "99+" : unread}
                </span>
              )}
            </Link>

            <Link
              href={area === "admin" ? "/admin/profil" : "/dashboard/profil"}
              className="flex items-center gap-2.5 rounded-full py-1 pl-1 pr-3 hover:bg-ink/5"
            >
              <Avatar name={user.name} image={user.image} />
              <span className="hidden text-sm sm:block">
                <span className="block font-medium leading-tight text-ink">{user.name}</span>
                <span className="block text-xs leading-tight text-ink/80">{user.email}</span>
              </span>
            </Link>
          </header>

          {announcement && (
            <p className="border-b border-ink/10 border-l-[3px] border-l-signal bg-mist px-4 py-2.5 text-sm text-signal-deep sm:px-6">
              {announcement}
            </p>
          )}

          <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
            {/* The cap lives here so the rail still hugs the viewport edge while
                tables and copy stay a readable width on an ultrawide monitor. */}
            <div className="mx-auto w-full max-w-[96rem]">{children}</div>
          </main>
        </div>
      </div>
    </div>
  );
}

function ShellLink({
  href,
  icon,
  label,
  onNavigate,
}: {
  href: string;
  icon: NavItem["icon"];
  label: string;
  onNavigate?: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onNavigate}
      className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-steel-pale transition-colors hover:bg-paper/8 hover:text-paper"
    >
      <Icon name={icon} className="size-[18px]" />
      {label}
    </Link>
  );
}

function Avatar({ name, image }: { name: string; image?: string | null }) {
  if (image) {
    // A plain <img>: these are arbitrary provider URLs (Google's CDN), and
    // next/image would need every one of their hosts in `remotePatterns`.
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={image} alt="" className="size-8 rounded-full object-cover" />;
  }
  const initials = name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
  return (
    <span className="flex size-8 items-center justify-center rounded-full bg-ink text-xs font-semibold text-paper">
      {initials || "?"}
    </span>
  );
}
