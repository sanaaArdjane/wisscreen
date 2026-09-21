import type { Metadata } from "next";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { account } from "@/lib/db/schema";
import { getCurrentSession, requireUser } from "@/lib/guard";
import { PageHeader, Panel } from "@/components/dashboard/PageHeader";
import { DeleteAccount, IdentityForm, PasswordForm, SessionList } from "@/components/dashboard/ProfileForms";
import { formatDate } from "@/lib/format";

export const metadata: Metadata = { title: "Mon profil" };

const ROLE_LABELS: Record<string, string> = {
  admin: "Administrateur",
  staff: "Équipe WICLOUD",
  user: "Client",
};

export default async function ProfilPage() {
  const user = await requireUser("/dashboard/profil");
  const session = await getCurrentSession();

  // Whether a password exists at all: a Google-only account has no credential
  // row, and offering it a "current password" field is a dead end.
  const [credential] = await db
    .select({ id: account.id })
    .from(account)
    .where(and(eq(account.userId, user.id), eq(account.providerId, "credential")))
    .limit(1);

  return (
    <>
      <PageHeader
        title="Mon profil"
        description="Vos informations, votre mot de passe et vos appareils connectés."
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="flex flex-col gap-6 lg:col-span-2">
          <Panel title="Informations">
            <IdentityForm
              name={user.name}
              email={user.email}
              phone={user.phone}
              company={user.company}
            />
          </Panel>

          <Panel
            title="Mot de passe"
            description="Changer votre mot de passe déconnecte vos autres appareils."
          >
            <PasswordForm hasPassword={Boolean(credential)} />
          </Panel>

          <Panel
            title="Appareils connectés"
            description="Révoquez l'accès d'un appareil que vous ne reconnaissez pas."
          >
            <SessionList currentToken={session?.session.token ?? ""} />
          </Panel>

          <Panel title="Supprimer mon compte">
            <DeleteAccount />
          </Panel>
        </div>

        <Panel title="Compte">
          <dl className="flex flex-col gap-3 text-sm">
            <Row label="Rôle" value={ROLE_LABELS[user.role ?? "user"] ?? user.role ?? "Client"} />
            <Row label="Adresse vérifiée" value={user.emailVerified ? "Oui" : "Non"} />
            <Row label="Membre depuis" value={formatDate(user.createdAt)} />
            <Row
              label="Connexion par lien"
              value={user.magicLinkEnabled ? "Activée" : "Désactivée"}
            />
          </dl>
        </Panel>
      </div>
    </>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <dt className="text-fg/80">{label}</dt>
      <dd className="text-right font-[650] text-fg">{value}</dd>
    </div>
  );
}
