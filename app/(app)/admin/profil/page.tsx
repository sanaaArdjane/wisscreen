import type { Metadata } from "next";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { account } from "@/lib/db/schema";
import { getCurrentSession, requireStaff } from "@/lib/guard";
import { PageHeader, Panel } from "@/components/dashboard/PageHeader";
import {
  DeleteAccount,
  IdentityForm,
  PasswordForm,
  SessionList,
} from "@/components/dashboard/ProfileForms";
import { effectivePermissions, ALL_PERMISSIONS } from "@/lib/permissions";
import { formatDate } from "@/lib/format";

export const metadata: Metadata = { title: "Mon profil" };

const ROLE_LABELS: Record<string, string> = {
  admin: "Administrateur",
  staff: "Équipe",
  user: "Client",
};

/**
 * The same profile as the client one, in the admin shell — so a staff member
 * never has to leave the back-office to change their password.
 *
 * It shows one extra thing: a count of the capabilities the account actually
 * has. Knowing what you can do is part of knowing your own account, and it
 * saves asking an admin to read the matrix out to you.
 */
export default async function AdminProfilPage() {
  const staff = await requireStaff();
  const session = await getCurrentSession();

  const [credential] = await db
    .select({ id: account.id })
    .from(account)
    .where(and(eq(account.userId, staff.id), eq(account.providerId, "credential")))
    .limit(1);

  const granted = Object.values(effectivePermissions(staff)).filter(Boolean).length;

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
              name={staff.name}
              email={staff.email}
              phone={staff.phone}
              company={staff.company}
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

          {staff.role !== "admin" && (
            <Panel title="Supprimer mon compte">
              <DeleteAccount />
            </Panel>
          )}
        </div>

        <Panel title="Compte">
          <dl className="flex flex-col gap-3 text-sm">
            <Row label="Rôle" value={ROLE_LABELS[staff.role ?? "user"] ?? staff.role ?? "—"} />
            <Row label="Accès accordés" value={`${granted} / ${ALL_PERMISSIONS.length}`} />
            <Row label="Adresse vérifiée" value={staff.emailVerified ? "Oui" : "Non"} />
            <Row label="Membre depuis" value={formatDate(staff.createdAt)} />
            <Row
              label="Connexion par lien"
              value={staff.magicLinkEnabled ? "Activée" : "Désactivée"}
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
