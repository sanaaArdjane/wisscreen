import type { Metadata } from "next";
import Link from "next/link";
import { SignOutLink } from "@/components/auth/AuthForms";
import { getCurrentUser } from "@/lib/guard";

export const metadata: Metadata = { title: "Compte suspendu", robots: { index: false } };

export default async function CompteSuspenduPage() {
  const user = await getCurrentUser();

  return (
    <>
      <h1 className="text-2xl font-semibold tracking-tight text-ink">Compte suspendu</h1>
      <p className="mt-2 text-sm text-ink/80">
        L&apos;accès à votre espace a été suspendu par un administrateur.
      </p>
      {user?.banReason && (
        <p className="mt-4 rounded-xl border border-ink/15 bg-mist px-4 py-3 text-sm text-ink">
          Motif : {user.banReason}
        </p>
      )}
      <p className="mt-4 text-sm text-ink/80">
        Écrivez-nous depuis la{" "}
        <Link href="/#contact" className="text-signal-deep underline underline-offset-4">
          page contact
        </Link>{" "}
        pour en savoir plus.
      </p>
      <div className="mt-6">
        <SignOutLink />
      </div>
    </>
  );
}
