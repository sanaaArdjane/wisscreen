import type { Metadata } from "next";
import Link from "next/link";
import AuthVisual from "./AuthVisual";
import AuthBackdrop from "./AuthBackdrop";
import "../(app)/heroui.css";
import "./auth.css";

/**
 * Nothing in this group belongs in a search index, and until now that was left to
 * each page to remember: `/connexion` and `/inscription` set it, `/reinitialiser`,
 * `/mot-de-passe-oublie` and `/verification` did not — and the build prerenders them
 * as static, indexable HTML. A password-reset form in Google's index is the kind of
 * thing nobody notices until it is quoted back at them.
 *
 * Here it covers the whole group, the way `app/(app)/layout.tsx` already does for the
 * dashboard, so a page added later inherits it rather than having to remember.
 * `follow: false` as well: there is nothing worth crawling onward from these.
 */
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function AuthLayout({ children }: LayoutProps<"/">) {
  return (
    <div
      data-wicloud-app
      data-auth
      data-theme="light"
      className="texture-weave-soft relative isolate min-h-dvh overflow-hidden text-ink"
    >
      <AuthBackdrop />
      <header className="relative mx-auto flex w-full max-w-7xl items-center justify-between px-6 py-6 sm:px-10 lg:px-12">
        <Link href="/" className="text-xl font-medium tracking-tight text-ink" aria-label="SETYCORP, accueil">
          SETYCORP<span className="text-signal-deep">.</span>
        </Link>
        <Link
          href="/"
          className="rounded-full bg-mist px-5 py-2.5 text-sm font-medium text-ink transition-colors hover:bg-mint focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
        >
          Retour au site <span aria-hidden>↗</span>
        </Link>
      </header>

      <main className="relative mx-auto grid w-full max-w-7xl items-center gap-10 px-6 pb-12 pt-5 sm:px-10 lg:min-h-[calc(100dvh-100px)] lg:grid-cols-[minmax(0,1fr)_440px] lg:gap-12 lg:px-12 lg:pb-10 lg:pt-0">
        {/* Both panels sit on a textured light ground, so they need their own edge — at
            `bg-mist/85` on `paper` there was nothing separating them from the page or from
            each other. A hairline ring plus the one soft shadow the design allows. */}
        <div className="hidden max-w-[680px] overflow-hidden rounded-[32px] bg-mist/85 p-10 shadow-[0_1px_2px_rgba(53,70,102,.04),0_8px_24px_rgba(53,70,102,.06)] ring-1 ring-ink/10 lg:block xl:p-12">
          <div className="mb-8 inline-flex size-14 items-center justify-center rounded-[30%] bg-paper text-2xl font-medium text-ink" aria-hidden>
            W
          </div>
          <p className="text-sm font-medium text-signal-deep">Votre espace SETYCORP</p>
          <h2 className="mt-5 text-5xl font-medium leading-[1.08] text-ink xl:text-6xl">
            Tout votre travail, au même endroit.
          </h2>
          <p className="mt-6 max-w-md text-xl font-light leading-relaxed text-ink/80">
            Suivez vos demandes, découvrez vos solutions et avancez avec votre équipe dans un espace pensé pour vous.
          </p>
          <AuthVisual />
        </div>

        <div className="w-full max-w-[440px] justify-self-center rounded-3xl bg-paper/95 p-6 shadow-[0_1px_2px_rgba(53,70,102,.04),0_8px_24px_rgba(53,70,102,.06)] ring-1 ring-ink/12 backdrop-blur-sm sm:p-9 lg:justify-self-end">
          {children}
        </div>
      </main>
    </div>
  );
}
