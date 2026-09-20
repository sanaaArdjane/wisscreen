import type { Metadata } from "next";
import Link from "next/link";
import { DOMAIN_LABELS, ACTION_LABELS, type Action, type Domain } from "@/lib/permissions";

export const metadata: Metadata = { title: "Accès refusé", robots: { index: false } };

/**
 * Where `requirePermission()` sends someone who is signed in but lacks the
 * capability. It names the missing permission on purpose: the people who land
 * here are staff, and "ask the admin for Factures → Modifier" is actionable in
 * a way that a bare 403 is not.
 */
export default async function AccesRefusePage({ searchParams }: PageProps<"/acces-refuse">) {
  const { perm } = await searchParams;
  const key = typeof perm === "string" ? perm : undefined;
  const [domain, action] = (key ?? "").split(":") as [Domain, Action];
  const readable =
    domain in DOMAIN_LABELS && action in ACTION_LABELS
      ? `${DOMAIN_LABELS[domain]} → ${ACTION_LABELS[action]}`
      : null;

  return (
    <>
      <h1 className="text-2xl font-semibold tracking-tight text-ink">Accès refusé</h1>
      <p className="mt-2 text-sm text-ink/80">
        Votre compte n&apos;a pas l&apos;autorisation nécessaire pour cette page.
      </p>
      {readable && (
        <p className="mt-4 rounded-xl border border-ink/15 bg-mist px-4 py-3 text-sm text-ink">
          Permission requise : <strong>{readable}</strong>
        </p>
      )}
      <div className="mt-6 flex flex-col gap-2 text-sm">
        <Link href="/admin" className="text-signal-deep underline underline-offset-4">
          Retour à l&apos;administration
        </Link>
        <Link href="/dashboard" className="text-signal-deep underline underline-offset-4">
          Aller à mon espace client
        </Link>
      </div>
    </>
  );
}
