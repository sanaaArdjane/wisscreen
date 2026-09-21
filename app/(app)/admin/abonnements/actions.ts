"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { plans, subscriptions } from "@/lib/db/schema";
import { requirePermission } from "@/lib/guard";
import { logActivity, notify } from "@/lib/account";
import { checkbox, fail, optionalText, parseForm, succeed, type ActionState } from "@/lib/actions";
import { parseMoneyToCents } from "@/lib/money";
import { parseLines } from "@/lib/kv";
import {
  SUBSCRIPTION_LABELS,
  SUBSCRIPTION_STATUSES,
  grantServiceQuotas,
  revokeServiceQuotas,
} from "@/lib/quotas";

/**
 * Provisioned services — a server, an SMTP allowance, an AI plan a customer
 * bought. The desk creates them from a demande or an accepted devis, and moves
 * them through `pending → provisioning → active → suspended / cancelled`.
 *
 * There is no payment provider: `renewsAt` is a date a human watches.
 */

function refresh(userId: string, id?: number) {
  revalidatePath("/admin/abonnements");
  if (id) revalidatePath(`/admin/abonnements/${id}`);
  revalidatePath(`/admin/utilisateurs/${userId}`);
  revalidatePath("/dashboard/abonnement");
  revalidatePath("/dashboard");
}

const dateOrNull = z
  .string()
  .trim()
  .optional()
  .transform((v) => (v ? new Date(`${v}T00:00:00`) : null))
  .refine((v) => v === null || !Number.isNaN(v.getTime()), "Date invalide.");

const ServiceSchema = z.object({
  subscriptionId: z.coerce.number().int().positive().optional(),
  userId: z.string().min(1, "Choisissez un client."),
  planSlug: optionalText,
  label: optionalText,
  requestId: z.coerce.number().int().positive().optional().or(z.literal("").transform(() => undefined)),
  quoteId: z.coerce.number().int().positive().optional().or(z.literal("").transform(() => undefined)),
  price: z.string().trim().default(""),
  currency: z.string().trim().toUpperCase().length(3).default("DZD"),
  billingPeriod: z.enum(["monthly", "yearly", "one_off"]),
  resourceSpec: z.string().max(5000).default(""),
  accessNotes: optionalText,
  status: z.enum(SUBSCRIPTION_STATUSES),
  periodStart: dateOrNull,
  renewsAt: dateOrNull,
  note: optionalText,
  grantQuotas: checkbox,
});

export async function saveService(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const staff = await requirePermission("subscriptions:write");
  const parsed = parseForm(ServiceSchema, formData);
  if (!parsed.ok) return parsed.state;
  const d = parsed.data;

  const [plan] = d.planSlug ? await db.select().from(plans).where(eq(plans.slug, d.planSlug)).limit(1) : [];
  if (d.planSlug && !plan) return fail("Offre inconnue.");
  if (!plan && !d.label) return fail("Donnez un nom au service sur mesure.", { label: "Requis." });

  // Blank price on a catalogue service means "the catalogue's price"; on a
  // bespoke one it means "sur devis".
  let priceCents: number | null = null;
  if (d.price !== "") {
    priceCents = parseMoneyToCents(d.price);
    if (priceCents === null || priceCents < 0) return fail("Prix invalide.", { price: "Montant invalide." });
  } else if (plan) {
    priceCents = plan.priceCents;
  }

  const spec = parseLines(d.resourceSpec);
  const values = {
    userId: d.userId,
    planSlug: plan?.slug ?? null,
    label: d.label ?? plan?.name ?? null,
    requestId: d.requestId ?? null,
    quoteId: d.quoteId ?? null,
    priceCents,
    currency: d.currency,
    billingPeriod: d.billingPeriod,
    resourceSpec: Object.keys(spec).length ? spec : (plan?.specs ?? {}),
    accessNotes: d.accessNotes ?? null,
    status: d.status,
    periodStart: d.periodStart ?? new Date(),
    renewsAt: d.renewsAt,
    note: d.note ?? null,
    updatedAt: new Date(),
  };

  let id = d.subscriptionId;
  let before: typeof subscriptions.$inferSelect | undefined;
  if (id) {
    [before] = await db.select().from(subscriptions).where(eq(subscriptions.id, id)).limit(1);
    if (!before) return fail("Service introuvable.");
    await db.update(subscriptions).set(values).where(eq(subscriptions.id, id));
  } else {
    const [row] = await db.insert(subscriptions).values(values).returning({ id: subscriptions.id });
    id = row.id;
  }

  // Quotas are granted once, on request — ticking the box again on an edit
  // would stack a second allowance, which is sometimes exactly what an upgrade
  // means and sometimes a mistake. So it is explicit, never automatic.
  if (d.grantQuotas && plan && Object.keys(plan.defaultQuotas ?? {}).length) {
    await grantServiceQuotas(d.userId, plan.defaultQuotas);
  }

  await logActivity({
    actorId: staff.id,
    action: d.subscriptionId ? "subscription.updated" : "subscription.provisioned",
    entity: "subscription",
    entityId: id,
    meta: { userId: d.userId, planSlug: plan?.slug, status: d.status, grantedQuotas: d.grantQuotas },
  });

  const name = values.label ?? "Votre service";
  if (!before || before.status !== d.status) {
    await notify({
      userId: d.userId,
      type: "subscription",
      title:
        d.status === "active"
          ? `${name} est actif`
          : d.status === "suspended"
            ? `${name} est suspendu`
            : d.status === "cancelled"
              ? `${name} a été résilié`
              : `${name} : ${SUBSCRIPTION_LABELS[d.status].toLowerCase()}`,
      href: "/dashboard/abonnement",
      actorId: staff.id,
      entity: "subscription",
      entityId: id,
    });
  }

  refresh(d.userId, id);
  if (!d.subscriptionId) redirect(`/admin/abonnements/${id}`);
  return succeed("Service enregistré.");
}

const DeleteSchema = z.object({
  subscriptionId: z.coerce.number().int().positive(),
  revokeQuotas: checkbox,
});

/**
 * Delete a service outright. For a customer who stopped paying, "résilié" is
 * the right move — it keeps the record. This is for a row that should never
 * have existed. Optionally takes back the quotas its offer grants.
 */
export async function deleteService(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const staff = await requirePermission("subscriptions:delete");
  const parsed = parseForm(DeleteSchema, formData);
  if (!parsed.ok) return parsed.state;

  const [row] = await db
    .select({ sub: subscriptions, plan: plans })
    .from(subscriptions)
    .leftJoin(plans, eq(plans.slug, subscriptions.planSlug))
    .where(eq(subscriptions.id, parsed.data.subscriptionId))
    .limit(1);
  if (!row) return fail("Service introuvable.");

  if (parsed.data.revokeQuotas && row.plan) {
    await revokeServiceQuotas(row.sub.userId, row.plan.defaultQuotas ?? {});
  }
  await db.delete(subscriptions).where(eq(subscriptions.id, row.sub.id));
  await logActivity({
    actorId: staff.id,
    action: "subscription.deleted",
    entity: "subscription",
    entityId: row.sub.id,
    meta: { userId: row.sub.userId, label: row.sub.label, revokedQuotas: parsed.data.revokeQuotas },
  });
  refresh(row.sub.userId);
  redirect("/admin/abonnements");
}
