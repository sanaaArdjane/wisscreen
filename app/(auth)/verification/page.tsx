import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Confirmez votre adresse", robots: { index: false } };

/** Where a sign-up lands when verification is required before the dashboard. */
export default function VerificationPage() {
  return (
    <>
      <h1 className="text-2xl font-semibold tracking-tight text-ink">Confirmez votre adresse</h1>
      <p className="mt-2 text-sm text-ink/80">
        Un e-mail vient de vous être envoyé. Ouvrez-le et cliquez sur le lien pour activer
        votre espace WICLOUD.
      </p>
      <p className="mt-4 text-sm text-ink/80">
        Rien reçu ? Vérifiez vos indésirables, puis réessayez de vous connecter — un
        nouveau lien sera envoyé.
      </p>
      <Link
        href="/connexion"
        className="mt-6 inline-block text-sm text-signal-deep underline underline-offset-4"
      >
        Retour à la connexion
      </Link>
    </>
  );
}
