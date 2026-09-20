import type { Metadata } from "next";
import Link from "next/link";
import { and, desc, eq, ilike, or, sql, type SQL } from "drizzle-orm";
import { db } from "@/lib/db";
import { plans, subscriptions, user as userTable } from "@/lib/db/schema";
import { requirePermission } from "@/lib/guard";
import { can } from "@/lib/permissions";
import { PageHeader, Panel } from "@/components/dashboard/PageHeader";
import { EmptyState, StatusChip } from "@/components/dashboard/ui";
import { FilterBar } from "@/components/dashboard/FilterBar";
import { formatDate, relativeTime } from "@/lib/format";
import { Icon } from "@/components/ui/Icon";

export const metadata: Metadata = { title: "Utilisateurs" };

const ROLE_LABELS: Record<string, string> = {
  admin: "Administrateur",
  staff: "Équipe",
  user: "Client",
};

const ROLE_TONE: Record<string, string> = {
  admin: "bg-signal/15 text-ink border-signal/45",
  staff: "bg-steel/15 text-ink border-steel/40",
  user: "bg-ink/5 text-ink border-ink/15",
};

export default async function UtilisateursPage({ searchParams }: PageProps<"/admin/utilisateurs">) {
  const staff = await requirePermission("users:read");
  const { q, role, etat } = await searchParams;

  const filters: SQL[] = [];

  const roleFilter = typeof role === "string" ? role : "tous";
  if (roleFilter !== "tous") filters.push(eq(userTable.role, roleFilter));

  const state = typeof etat === "string" ? etat : "tous";
  if (state === "suspendus") filters.push(sql`${userTable.banned} is true`);
  if (state === "actifs") filters.push(sql`${userTable.banned} is not true`);

  const search = typeof q === "string" ? q.trim() : "";
  if (search) {
    const like = `%${search}%`;
    filters.push(
      or(
        ilike(userTable.name, like),
        ilike(userTable.email, like),
        ilike(userTable.company, like),
      )!,
    );
  }

  const rows = await db
    .select({
      user: userTable,
      planName: plans.name,
    })
    .from(userTable)
    .leftJoin(subscriptions, eq(subscriptions.userId, userTable.id))
    .leftJoin(plans, eq(plans.slug, subscriptions.planSlug))
    .where(filters.length ? and(...filters) : undefined)
    .orderBy(desc(userTable.createdAt))
    .limit(300);

  return (
    <>
      <PageHeader
        title="Utilisateurs"
        description={`${rows.length} compte${rows.length > 1 ? "s" : ""} — cliquez pour gérer les accès, la formule et les quotas.`}
        actions={
          can(staff, "users:write") && (
            <Link
              href="/admin/utilisateurs/nouveau"
              className="control-signal inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-medium"
            >
              <Icon name="plus" className="size-4" />
              Nouveau compte
            </Link>
          )
        }
      />

      <FilterBar
        basePath="/admin/utilisateurs"
        searchPlaceholder="Nom, e-mail, société…"
        filters={[
          {
            name: "role",
            label: "Rôle",
            value: roleFilter,
            options: [
              { value: "tous", label: "Tous" },
              { value: "user", label: "Clients" },
              { value: "staff", label: "Équipe" },
              { value: "admin", label: "Administrateurs" },
            ],
          },
          {
            name: "etat",
            label: "État",
            value: state,
            options: [
              { value: "tous", label: "Tous" },
              { value: "actifs", label: "Actifs" },
              { value: "suspendus", label: "Suspendus" },
            ],
          },
        ]}
      />

      {rows.length === 0 ? (
        <EmptyState title="Aucun compte ne correspond" description="Élargissez les filtres." />
      ) : (
        <Panel bodyClassName="p-0">
          <ul className="divide-y divide-ink/10">
            {rows.map(({ user, planName }) => (
              <li key={user.id}>
                <Link
                  href={`/admin/utilisateurs/${user.id}`}
                  className="flex flex-col gap-2 px-5 py-4 transition-colors hover:bg-mist sm:flex-row sm:items-center sm:gap-4"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-ink">
                      {user.name}
                      {user.banned && (
                        <span className="ml-2 rounded-full border border-ink/25 bg-ink/5 px-2 py-0.5 text-[11px] font-normal text-ink/80">
                          Suspendu
                        </span>
                      )}
                    </p>
                    <p className="mt-0.5 truncate text-xs text-ink/80">
                      {user.email}
                      {user.company && ` · ${user.company}`}
                      {` · inscrit ${relativeTime(user.createdAt)}`}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-3">
                    {planName && <span className="text-xs text-ink/80">{planName}</span>}
                    <span className="hidden text-xs text-ink/80 sm:block">
                      {formatDate(user.createdAt)}
                    </span>
                    <StatusChip
                      label={ROLE_LABELS[user.role] ?? user.role}
                      tone={ROLE_TONE[user.role] ?? ROLE_TONE.user}
                    />
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </Panel>
      )}
    </>
  );
}
