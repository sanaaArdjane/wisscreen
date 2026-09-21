import type { Metadata } from "next";
import { requirePermission } from "@/lib/guard";
import { can, ROLES } from "@/lib/permissions";
import { PageHeader, Panel } from "@/components/dashboard/PageHeader";
import { CreateUserForm } from "./CreateUserForm";
import { emailConfigured } from "@/lib/email";

export const metadata: Metadata = { title: "Nouveau compte" };

const ROLE_LABELS: Record<string, string> = {
  user: "Client",
  staff: "Équipe",
  admin: "Administrateur",
};

export default async function NouvelUtilisateurPage() {
  const staff = await requirePermission("users:write");
  const canCreateStaff = can(staff, "team:write");

  return (
    <>
      <PageHeader
        title="Nouveau compte"
        description="Ouvrez un accès pour un client, ou ajoutez un membre à l'équipe."
        backHref="/admin/utilisateurs"
        backLabel="Utilisateurs"
      />

      <Panel className="max-w-3xl">
        <CreateUserForm
          canCreateStaff={canCreateStaff}
          // The list is filtered rather than disabled: offering a role that the
          // action will refuse is a form that lies about what it can do.
          roleOptions={ROLES.filter((r) => canCreateStaff || r === "user").map((r) => ({
            value: r,
            label: ROLE_LABELS[r] ?? r,
          }))}
        />
        {!emailConfigured() && (
          <p className="mt-5 border-t border-fg/10 pt-4 text-xs text-fg/80">
            L&apos;envoi d&apos;e-mails n&apos;est pas configuré sur cet environnement : la case
            « envoyer les identifiants » écrira le message dans les journaux du serveur au lieu
            de l&apos;expédier. Communiquez le mot de passe autrement.
          </p>
        )}
      </Panel>
    </>
  );
}
