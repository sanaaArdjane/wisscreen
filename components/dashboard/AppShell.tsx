"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { cn } from "@/lib/cn";
import { authClient } from "@/lib/auth-client";
import { isActive, type NavItem } from "@/components/dashboard/nav";
import { isDarkTheme, THEME_COOKIE, type Theme } from "@/lib/theme";

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
  theme: initialTheme = "system",
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
  /** From the `wc-theme` cookie, so the first paint is already the right one. */
  theme?: Theme;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [theme, setThemeState] = useState<Theme>(initialTheme);
  // False while the page is at the top (the bar floats as a pill); true once the
  // visitor has scrolled (it becomes a full-width bar). Driven by an observer on
  // a sentinel rather than a scroll listener: nothing runs per scroll event.
  const [scrolled, setScrolled] = useState(false);
  const sentinel = useRef<HTMLDivElement>(null);
  // True while the nav has items below its bottom edge. The rail's scrollbar is
  // hidden (it used to eat 10px of the tab's width and tint the column), so this
  // fade is the only thing left saying "there is more down here".
  const [more, setMore] = useState(false);
  const navRef = useRef<HTMLElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  // What the visitor last clicked. The tab moves on the *click*, not when the
  // server's payload lands: `usePathname` only changes once the new route has
  // committed, and on a dashboard page that is a round trip you can watch — the
  // old item stayed lit the whole time, then the tab jumped. Clearing it during
  // render (React's own "adjust state when a prop changes" pattern) rather than
  // from an effect keeps it to one render with no intermediate paint.
  const [pending, setPending] = useState<string | null>(null);
  const [lastPath, setLastPath] = useState(pathname);
  if (lastPath !== pathname) {
    setLastPath(pathname);
    setPending(null);
  }
  const selected = pending ?? nav.find((item) => isActive(pathname, item))?.href ?? null;

  useEffect(() => {
    const el = sentinel.current;
    if (!el) return;
    const io = new IntersectionObserver(([entry]) => setScrolled(!entry.isIntersecting));
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    const el = navRef.current;
    const list = listRef.current;
    if (!el || !list) return;
    // 1px of slack: fractional layout means `scrollTop + clientHeight` lands
    // just shy of `scrollHeight` at the bottom, and the fade never clears.
    const update = () => setMore(el.scrollTop + el.clientHeight < el.scrollHeight - 1);
    update();
    el.addEventListener("scroll", update, { passive: true });
    // The rail's height and the list's content can both change (a viewport
    // resize, a nav that gains an entry), and neither fires `scroll`.
    const ro = new ResizeObserver(update);
    ro.observe(el);
    ro.observe(list);
    return () => {
      el.removeEventListener("scroll", update);
      ro.disconnect();
    };
  }, []);

  // The drawer closes on the click that navigates, not in an effect watching the
  // pathname. Tapping a link on a phone must not leave the drawer covering the
  // page you just asked for — and setting state from an effect to achieve that
  // is a cascading render React's own lint rule rejects.
  const close = () => setOpen(false);

  function setTheme(next: Theme) {
    // One year, site-wide: the server reads it to render `data-theme`.
    document.cookie = `${THEME_COOKIE}=${next}; path=/; max-age=31536000; samesite=lax`;
    setThemeState(next);
  }

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
    <div
      data-wicloud-app
      // `system` renders no attribute: `color-scheme: light dark` follows the OS.
      data-theme={theme === "system" ? undefined : theme}
      className="min-h-dvh bg-canvas text-fg"
    >
      {impersonating && (
        <div className="flex flex-wrap items-center justify-center gap-3 bg-ink px-4 py-2.5 text-center text-sm text-paper">
          <span>Vous consultez la plateforme en tant que {user.name}.</span>
          <button
            type="button"
            onClick={stopImpersonating}
            className="rounded-full border border-paper/40 px-3.5 py-1 text-xs font-[650] hover:bg-paper/10"
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
            "fixed inset-y-0 left-0 z-50 flex w-72 flex-col bg-ink text-paper transition-transform duration-300 ease-out lg:sticky lg:top-0 lg:h-dvh lg:translate-x-0",
            open ? "translate-x-0" : "-translate-x-full",
          )}
        >
          <div className="flex items-center justify-between px-6 py-6">
            <Link href={home} className="text-xl font-[650] leading-none">
              WI<span className="text-signal-soft">CLOUD</span>
            </Link>
            <button
              type="button"
              onClick={close}
              className="rounded-full p-2 hover:bg-paper/10 lg:hidden"
              aria-label="Fermer le menu"
            >
              <Icon name="close" className="size-5" />
            </button>
          </div>

          <p className="px-6 text-xs font-[650] text-steel-pale">
            {area === "admin" ? "Administration" : "Espace client"}
          </p>

          {/* `pr-0`: the active tab runs to the rail's right edge, so the gutter
              is a margin on the *inactive* items instead of padding here. `pt-4`
              is what gives the first item's notch somewhere to draw — this is a
              scroll container, so anything above its content box is clipped. */}
          {/* The fade has to live outside the scroll container: an absolute child
              of a scrolling box scrolls away with the content. */}
          <div className="relative flex min-h-0 flex-1 flex-col">
            <nav
              ref={navRef}
              className="scrollbar-none flex-1 overflow-y-auto pb-4 pl-4 pr-0 pt-4"
            >
              <ul ref={listRef} className="flex flex-col gap-0.5">
                {nav.map((item) => {
                  // `selected` for the paint, the real pathname for assistive
                  // tech: the tab may already have moved to a route that has not
                  // committed yet, and `aria-current` must not claim it has.
                  const active = item.href === selected;
                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        onClick={() => {
                          setPending(item.href);
                          close();
                        }}
                        aria-current={isActive(pathname, item) ? "page" : undefined}
                        className={cn(
                          // No colour transition here, deliberately. A fade is
                          // what *creates* the ghost: the outgoing tab spends
                          // 150ms as a half-white pill with its label already
                          // dimmed, which is the "I can still see the previous
                          // one" artefact. The selection is a discrete change
                          // and now happens on the click, so it should land on
                          // the click. Hover still reads fine snapping.
                          "relative flex items-center gap-3 py-2.5 pl-4 pr-4 text-sm",
                          active
                            // A tab cut out of the page, not a pill on the rail:
                            // the content area's own colour, rounded on the left,
                            // square and flush on the right. `z-10` puts it above
                            // the next item, whose row the bottom notch reaches
                            // into (`.nav-tab` in globals.css).
                            ? "nav-tab z-10 rounded-l-full bg-canvas font-[650] text-fg"
                            : "mr-4 rounded-full font-[450] text-steel-pale hover:bg-paper/8 hover:text-paper",
                        )}
                      >
                        <Icon name={item.icon} className="size-[18px] shrink-0" />
                        <span className="min-w-0 flex-1 truncate">{item.label}</span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </nav>

            {/* The last row dissolves into the rail instead of being cut off at
                it. Opacity rather than a conditional render, so it eases away as
                you reach the bottom rather than blinking out. */}
            <div
              aria-hidden
              className={cn(
                "pointer-events-none absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-ink via-ink/80 to-transparent transition-opacity duration-200",
                more ? "opacity-100" : "opacity-0",
              )}
            />
          </div>

          <div className="border-t border-paper/10 px-4 py-4">
            {/* One sidebar per account, and no "switch to my other dashboard".
                A staff member has no client space of their own — `Mon profil` is
                in the nav above, and seeing what a client sees is what
                impersonation is for. */}
            <ThemeToggle theme={theme} onChange={setTheme} />
            <ShellLink href="/" icon="external" label="Retour au site" onNavigate={close} />
            <button
              type="button"
              onClick={signOut}
              className="flex w-full items-center gap-3 rounded-full px-4 py-2.5 text-sm font-[450] text-steel-pale transition-colors hover:bg-paper/8 hover:text-paper"
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
            className="fixed inset-0 z-40 bg-abyss/40 lg:hidden"
          />
        )}

        {/* ── Content ─────────────────────────────────────────────────────── */}
        <div className="relative flex min-w-0 flex-1 flex-col">
          <div
            ref={sentinel}
            aria-hidden
            className="pointer-events-none absolute inset-x-0 top-0 h-3"
          />
          {/* Mobbin's nav-pill at the top of the page: detached from the viewport
              edge, centred over the content column. Once the page scrolls it
              docks — the gutter, the radius and the cap all animate away and it
              becomes a full-width bar with a hairline, translucent over the
              content passing under it. Both states are the same element, so the
              change is a transition, not a swap. */}
          <div
            className={cn(
              "sticky top-0 z-30 transition-[padding] duration-300 ease-out",
              scrolled ? "px-0 pt-0" : "px-4 pt-4 sm:px-6 lg:px-8",
            )}
          >
            <header
              className={cn(
                "mx-auto flex w-full items-center gap-2 transition-[max-width,border-radius,padding,background-color] duration-300 ease-out",
                scrolled
                  ? "max-w-[160rem] rounded-none border-b border-fg/10 bg-canvas/85 px-4 py-2.5 backdrop-blur-md sm:px-6 lg:px-8"
                  : "max-w-[96rem] rounded-full border-b border-transparent bg-soft px-2 py-1.5",
              )}
            >
              <button
                type="button"
                onClick={() => setOpen(true)}
                className="rounded-full p-2.5 text-fg hover:bg-fg/8 lg:hidden"
                aria-label="Ouvrir le menu"
              >
                <Icon name="menu" className="size-5" />
              </button>

              <div className="flex-1" />

              <Link
                href={area === "admin" ? "/admin/notifications" : "/dashboard/notifications"}
                className="relative rounded-full p-2.5 text-fg hover:bg-fg/8"
                aria-label={
                  unread > 0 ? `Notifications (${unread} non lues)` : "Notifications"
                }
              >
                <Icon name="bell" className="size-5" />
                {unread > 0 && (
                  <span className="absolute -right-0.5 -top-0.5 flex min-w-[18px] items-center justify-center rounded-full bg-signal px-1 text-[10px] font-[650] text-abyss">
                    {unread > 99 ? "99+" : unread}
                  </span>
                )}
              </Link>

              <Link
                href={area === "admin" ? "/admin/profil" : "/dashboard/profil"}
                className="flex items-center gap-2.5 rounded-full py-1 pl-1 pr-4 hover:bg-fg/8"
              >
                <Avatar name={user.name} image={user.image} />
                <span className="hidden text-sm sm:block">
                  <span className="block font-[650] leading-tight text-fg">{user.name}</span>
                  <span className="block text-xs font-[450] leading-tight text-fg/80">
                    {user.email}
                  </span>
                </span>
              </Link>
            </header>
          </div>

          {announcement && (
            <p className="mx-4 mt-4 flex items-start gap-3 rounded-2xl bg-soft px-6 py-3.5 text-sm text-fg sm:mx-6 lg:mx-8">
              <span aria-hidden className="mt-1.5 size-2 shrink-0 rounded-full bg-signal" />
              {announcement}
            </p>
          )}

          <main className="flex-1 px-4 pb-10 pt-8 sm:px-6 lg:px-8 lg:pb-14 lg:pt-10">
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
      className="flex items-center gap-3 rounded-full px-4 py-2.5 text-sm font-[450] text-steel-pale transition-colors hover:bg-paper/8 hover:text-paper"
    >
      <Icon name={icon} className="size-[18px]" />
      {label}
    </Link>
  );
}

/**
 * The light/dark toggle: one row in the sidebar footer, shaped like its `ShellLink`
 * neighbours so the footer reads as one group.
 *
 * **Which icon shows is decided by CSS, not by state.** `theme` can be `system`, and
 * the server has no way to know what that resolves to — a JS-picked icon would be
 * either a hydration mismatch or a flash on every first paint. So both icons are
 * always rendered, stacked in one grid cell, and `--dash-sun-o` / `--dash-moon-o`
 * (a `light-dark()` pair in `app/(app)/heroui.css`) show the right one. The swap is
 * instant, like the rest of the theme switch — there is no transition anywhere in it.
 *
 * `system` stays a valid `Theme` — it is what an absent cookie means, and what the
 * server renders — this control just never writes it back. The first click resolves
 * the visitor to an explicit preference.
 */
function ThemeToggle({ theme, onChange }: { theme: Theme; onChange: (next: Theme) => void }) {
  return (
    <button
      type="button"
      // Scheme-agnostic on purpose: a label that flipped would be wrong at SSR
      // time for `system`, for the same reason the icon cannot be picked in JS.
      aria-label="Changer de thème"
      onClick={() => onChange(isDarkTheme(theme) ? "light" : "dark")}
      className="flex w-full items-center gap-3 rounded-full px-4 py-2.5 text-sm font-[450] text-steel-pale transition-colors hover:bg-paper/8 hover:text-paper"
    >
      <span aria-hidden className="grid size-[18px] shrink-0 place-items-center">
        <Icon
          name="sun"
          className="col-start-1 row-start-1 size-[18px]"
          style={{ opacity: "var(--dash-sun-o)" }}
        />
        <Icon
          name="moon"
          className="col-start-1 row-start-1 size-[18px]"
          style={{ opacity: "var(--dash-moon-o)" }}
        />
      </span>
      Thème
    </button>
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
    <span className="flex size-8 items-center justify-center rounded-full bg-fg text-xs font-[650] text-on-fg">
      {initials || "?"}
    </span>
  );
}
