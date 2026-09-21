import Link from "next/link";
import AuthVisual from "./AuthVisual";
import AuthBackdrop from "./AuthBackdrop";
import "../(app)/heroui.css";
import "./auth.css";

export default function AuthLayout({ children }: LayoutProps<"/">) {
  return (
    <div data-wicloud-app data-theme="light" className="relative isolate min-h-dvh overflow-hidden bg-paper text-ink">
      <AuthBackdrop />
      <header className="relative mx-auto flex w-full max-w-7xl items-center justify-between px-6 py-6 sm:px-10 lg:px-12">
        <Link href="/" className="text-xl font-[650] tracking-tight text-ink" aria-label="WICLOUD, accueil">
          WICLOUD<span className="text-signal-deep">.</span>
        </Link>
        <Link
          href="/"
          className="rounded-full bg-mist px-5 py-2.5 text-sm font-semibold text-ink transition-colors hover:bg-ink/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
        >
          Retour au site <span aria-hidden>↗</span>
        </Link>
      </header>

      <main className="relative mx-auto grid w-full max-w-7xl items-center gap-10 px-6 pb-12 pt-5 sm:px-10 lg:min-h-[calc(100dvh-100px)] lg:grid-cols-[minmax(0,1fr)_440px] lg:gap-12 lg:px-12 lg:pb-10 lg:pt-0">
        <div className="hidden max-w-[680px] overflow-hidden rounded-[32px] bg-mist/85 p-10 lg:block xl:p-12">
          <div className="mb-8 inline-flex size-14 items-center justify-center rounded-[30%] bg-paper text-2xl font-[650] text-ink" aria-hidden>
            W
          </div>
          <p className="text-sm font-semibold text-signal-deep">Votre espace WICLOUD</p>
          <h2 className="mt-5 text-5xl font-[650] leading-[1.08] text-ink xl:text-6xl">
            Tout votre travail, au même endroit.
          </h2>
          <p className="mt-6 max-w-md text-xl font-light leading-relaxed text-ink/80">
            Suivez vos demandes, découvrez vos solutions et avancez avec votre équipe dans un espace pensé pour vous.
          </p>
          <AuthVisual />
        </div>

        <div className="w-full max-w-[440px] justify-self-center rounded-3xl border border-ink/10 bg-paper/90 p-6 sm:p-9 lg:justify-self-end">
          {children}
        </div>
      </main>
    </div>
  );
}
