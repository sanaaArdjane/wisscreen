"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { eq, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { plans, subscriptions } from "@/lib/db/schema";
import { requirePermission } from "@/lib/guard";
import { logActivity } from "@/lib/account";
import { checkbox, fail, parseForm, succeed, type ActionState } from "@/lib/actions";
import { parseMoneyToCents } from "@/lib/money";
import { listLines, parseGrants, parseLines } from "@/lib/kv";

/**
 * The catalogue of what WICLOUD sells — the table is still called `plans`,
 * see its comment in the schema. It had no admin CRUD at all: the three
 * platform tiers were seed-only.
 */

function refresh(slug?: string) {
  revalidatePath("/admin/catalogue");
  if (slug) revalidatePath(`/admin/catalogue/${slug}`);
  revalidatePath("/admin/abonnements");
  revalidatePath("/dashboard/abonnement");
}

const ItemSchema = z.object({
  originalSlug: z.string().optional(),
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Lettres minuscules, chiffres et tirets.")
    .max(60),
  name: z.string().trim().min(2, "Nom requis.").max(120),
  description: z.string().trim().min(1, "Une phrase au moins.").max(2000),
  category: z.enum(["infrastructure", "addon", "support"]),
  // "" = sur devis; otherwise units, converted to cents.
  price: z.string().trim(),
  currency: z.string().trim().toUpperCase().length(3).default("DZD"),
  billingPeriod: z.enum(["monthly", "yearly", "one_off"]),
  specs: z.string().max(5000).default(""),
  features: z.string().max(5000).default(""),
  grants: z.string().max(5000).default(""),
  sortOrder: z.coerce.number().int().min(0).max(9999).default(0),
  active: checkbox,
});

export async function saveCatalogueItem(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const staff = await requirePermission("subscriptions:write");
  const parsed = parseForm(ItemSchema, formData);
  if (!parsed.ok) return parsed.state;
  const d = parsed.data;

  let priceCents: number | null = null;
  if (d.price !== "") {
    priceCents = parseMoneyToCents(d.price);
    if (priceCents === null || priceCents < 0) return fail("Prix invalide.", { price: "Montant invalide." });
  }
  const grants = parseGrants(d.grants);
  if (!grants.ok) return fail(grants.error, { grants: grants.error });

  const values = {
    slug: d.slug,
    name: d.name,
    description: d.description,
    category: d.category,
    priceCents,
    currency: d.currency,
    billingPeriod: d.billingPeriod,
    specs: parseLines(d.specs),
    features: listLines(d.features),
    // A `null` grant (unlimited) is stored as-is; the jsonb column's type says
    // number but `grantServiceQuotas` reads null as "no cap".
    defaultQuotas: grants.grants as Record<string, number>,
    sortOrder: d.sortOrder,
    active: d.active,
  };

  try {
    if (d.originalSlug) {
      await db.update(plans).set(values).where(eq(plans.slug, d.originalSlug));
    } else {
      await db.insert(plans).values(values);
    }
  } catch (err) {
    if (typeof err === "object" && err !== null && "code" in err && err.code === "23505") {
      return fail("Cet identifiant existe déjà.", { slug: "Déjà utilisé." });
    }
    throw err;
  }

  await logActivity({
    actorId: staff.id,
    action: d.originalSlug ? "catalogue.updated" : "catalogue.created",
    entity: "plan",
    entityId: d.slug,
    meta: { name: d.name, priceCents },
  });

  refresh(d.slug);
  if (!d.originalSlug || d.originalSlug !== d.slug) redirect(`/admin/catalogue/${d.slug}`);
  return succeed("Offre enregistrée.");
}

/**
 * Delete an offer. Services already provisioned from it keep everything they
 * need — label, price and spec were copied onto the subscription when it was
 * created — and simply lose the link back (`plan_slug` goes null). To stop
 * selling something without touching history, untick "active" instead.
 */
export async function deleteCatalogueItem(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const staff = await requirePermission("subscriptions:delete");
  const slug = String(formData.get("slug") ?? "");
  const [item] = await db.select().from(plans).where(eq(plans.slug, slug)).limit(1);
  if (!item) return fail("Offre introuvable.");
  if (String(formData.get("confirm") ?? "").trim() !== slug) {
    return fail(`Saisissez exactement « ${slug} » pour confirmer.`);
  }

  const [{ n }] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(subscriptions)
    .where(eq(subscriptions.planSlug, slug));

  await db.delete(plans).where(eq(plans.slug, slug));
  await logActivity({
    actorId: staff.id,
    action: "catalogue.deleted",
    entity: "plan",
    entityId: slug,
    meta: { name: item.name, detachedSubscriptions: n },
  });
  refresh();
  redirect("/admin/catalogue");
}
