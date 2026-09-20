import Link from "next/link";
import "../(app)/heroui.css";

/**
 * The signed-out chrome: brand panel left on `lg`, form right.
 *
 * It imports the dashboard stylesheet because the forms are HeroUI fields and
 * these pages are the doorway into the same product — sharing the sheet keeps
 * the sign-in inputs identical to the ones behind the login, and it is already
 * being fetched by the page the visitor is about to land on.
 */
export default function AuthLayout({ children }: LayoutProps<"/"> ) {
  return (
    <div data-wicloud-app className="flex min-h-dvh bg-paper text-ink">
      {/* Decorative panel. `aria-hidden` and no links: nothing here is content a
          screen-reader user needs before the form they came for. */}
      <aside
        aria-hidden
        className="relative hidden w-[42%] max-w-xl flex-col justify-between overflow-hidden bg-ink p-10 text-paper lg:flex"
      >
        <div
          className="absolute inset-0 opacity-[0.13]"
          style={{
            backgroundImage:
              "radial-gradient(circle, rgba(255,255,255,.55) 1px, transparent 1px)",
            backgroundSize: "22px 22px",
          }}
        />
        <div
          className="absolute -left-24 bottom-[-18%] size-[34rem] rounded-full opacity-45 blur-3xl"
          style={{
            background:
              "radial-gradient(circle, rgba(19,183,140,.5) 0%, rgba(19,183,140,0) 68%)",
          }}
        />
        <p className="relative text-xl font-semibold tracking-tight">
          WI<span className="text-signal-soft">CLOUD</span>
        </p>
        <div className="relative">
          <p className="text-3xl font-semibold leading-tight tracking-tight">
            Vos solutions, vos dossiers, vos équipes — au même endroit.
          </p>
          <p className="mt-4 max-w-sm text-sm text-steel-pale">
            Déposez une demande, suivez son avancement, testez nos solutions et
            gérez vos devis depuis un seul espace.
          </p>
        </div>
        <p className="relative text-xs text-steel-pale">
          OCR · Cloud Infrastructure · WIFACILITY · SETYCORE
        </p>
      </aside>

      <main className="flex flex-1 flex-col">
        <div className="px-6 pt-6 lg:hidden">
          <Link href="/" className="text-lg font-semibold tracking-tight">
            WI<span className="text-signal-deep">CLOUD</span>
          </Link>
        </div>
        <div className="flex flex-1 items-center justify-center px-6 py-10">
          <div className="w-full max-w-sm">{children}</div>
        </div>
      </main>
    </div>
  );
}
