import type { Metadata } from "next";
import Link from "next/link";
import { asc, inArray, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { user as userTable } from "@/lib/db/schema";
import { requirePermission } from "@/lib/guard";
import { PageHeader, Panel } from "@/components/dashboard/PageHeader";
import { EmptyState, StatusChip } from "@/components/dashboard/ui";
import { pillPrimary } from "@/components/dashboard/pills";
import {
  ACTION_LABELS,
  ALL_PERMISSIONS,
  DOMAINS,
  DOMAIN_LABELS,
  can,
  isRoleDefault,
  type Action,
  type PermissionKey,
} from "@/lib/permissions";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/cn";
import { Icon } from "@/components/ui/Icon";

export const metadata: Metadata = { title: "Équipe & accès" };

const ROLE_LABELS: Record<string, string> = {
  admin: "Administrateur",
  staff: "Équipe",
};

/**
 * Who on the team can do what, on one screen.
 *
 * Read-only by design: granting and revoking happens on the person's own page,
 * where the change is next to their name and lands in the activity log against
 * that account. This page exists to answer "who can issue invoices?" without
 * opening six profiles.
 */
export default async function EquipePage() {
  const staff = await requirePermission("team:read");

  const members = await db
    .select()
    .from(userTable)
    .where(inArray(userTable.role, ["admin", "staff"]))
    .orderBy(asc(userTable.role), asc(userTable.name));

  // A client account carrying an explicit grant is still someone with admin-area
  // access; leaving them off this page would make the list a lie.
  const irregular = await db
    .select()
    .from(userTable)
    .where(sql`${userTable.role} = 'user' and ${userTable.permissions} is not null`)
    .orderBy(asc(userTable.name));

  const rows = [...members, ...irregular];
  const actions: Action[] = ["read", "write", "delete"];

  return (
    <>
      <PageHeader
        title="Équipe & accès"
        description="Vue d'ensemble des permissions. Les modifications se font depuis la fiche de chaque personne."
        actions={
          can(staff, "team:write") && (
            <Link
              href="/admin/utilisateurs/nouveau"
              className={pillPrimary}
            >
              <Icon name="plus" className="size-4" />
              Ajouter un membre
            </Link>
          )
        }
      />

      {rows.length === 0 ? (
        <EmptyState
          title="Aucun membre d'équipe"
          description="Passez un compte au rôle « Équipe » depuis la liste des utilisateurs."
          action={
            <Link
              href="/admin/utilisateurs"
              className={`${pillPrimary} mt-2`}
            >
              Ouvrir les utilisateurs
            </Link>
          }
        />
      ) : (
        <div className="flex flex-col gap-4">
          {rows.map((member) => {
            const overrides = Object.keys(member.permissions ?? {}).length;
            return (
              <Panel
                key={member.id}
                title={member.name}
                description={`${member.email} · membre depuis le ${formatDate(member.createdAt)}`}
                actions={
                  <>
                    {overrides > 0 && (
                      <span className="text-xs text-fg/80">
                        {overrides} exception{overrides > 1 ? "s" : ""}
                      </span>
                    )}
                    {member.banned && (
                      <StatusChip label="Suspendu" tone="bg-fg text-on-fg border-fg" />
                    )}
                    <StatusChip
                      label={ROLE_LABELS[member.role] ?? "Client avec accès"}
                      tone={
                        member.role === "admin"
                          ? "bg-signal/15 text-fg border-signal/45"
                          : member.role === "staff"
                            ? "bg-steel/15 text-fg border-steel/40"
                            : "bg-fg/5 text-fg border-fg/15"
                      }
                    />
                    {can(staff, "team:write") && (
                      <Link
                        href={`/admin/utilisateurs/${member.id}`}
                        className="text-sm font-[650] text-fg underline underline-offset-4"
                      >
                        Modifier
                      </Link>
                    )}
                  </>
                }
              >
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[34rem] text-sm">
                    <caption className="sr-only">Permissions de {member.name}</caption>
                    <thead>
                      <tr className="text-left text-xs text-fg/80">
                        <th scope="col" className="rounded-l-2xl bg-soft px-4 py-2.5 font-[650]">
                          Domaine
                        </th>
                        {actions.map((a) => (
                          <th key={a} scope="col" className="bg-soft px-2 py-2.5 text-center font-[650] last:rounded-r-2xl">
                            {ACTION_LABELS[a]}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-fg/5">
                      {DOMAINS.map((domain) => (
                        <tr key={domain}>
                          <th scope="row" className="py-1.5 pr-4 text-left font-normal text-fg">
                            {DOMAIN_LABELS[domain]}
                          </th>
                          {actions.map((a) => {
                            const key = `${domain}:${a}` as PermissionKey;
                            const granted = can(member, key);
                            const overridden = granted !== isRoleDefault(member.role, key);
                            return (
                              <td key={key} className="py-1.5 text-center">
                                <span
                                  title={
                                    overridden
                                      ? `Exception au rôle « ${member.role} »`
                                      : undefined
                                  }
                                  className={cn(
                                    "inline-flex size-6 items-center justify-center rounded-md",
                                    granted ? "bg-signal text-abyss" : "text-fg/25",
                                    overridden && "ring-1 ring-fg/40",
                                  )}
                                >
                                  <Icon
                                    name={granted ? "check" : "close"}
                                    className="size-3.5"
                                    strokeWidth={2.4}
                                  />
                                  <span className="sr-only">
                                    {granted ? "autorisé" : "refusé"}
                                  </span>
                                </span>
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Panel>
            );
          })}
        </div>
      )}

      <p className="mt-6 text-xs text-fg/80">
        {ALL_PERMISSIONS.length} permissions au total. Les cases entourées sont des
        exceptions accordées ou retirées individuellement.
      </p>
    </>
  );
}
