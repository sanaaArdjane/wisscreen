/**
 * Idempotent seed: a starting service catalogue and the default settings.
 *
 * Run with `pnpm db:seed`. Everything upserts, so running it again after a
 * catalogue edit re-applies these defaults to *these slugs* — edit the
 * catalogue from /admin/catalogue instead once it is in use. It deliberately
 * does **not** create the admin account: that happens on first sign-up with
 * `ADMIN_EMAIL` (`databaseHooks.user.create.before` in `lib/auth.ts`), so no
 * seeded password ever sits in the repo.
 *
 * The three old platform tiers (Découverte / Pro / Entreprise) are marked
 * inactive rather than deleted: live subscriptions may still point at them.
 */
import { and, eq, inArray } from "drizzle-orm";
import { db } from "@/lib/db";
import { plans, appSettings, subscriptions } from "@/lib/db/schema";
import { DEFAULT_SETTINGS, SETTING_KEYS } from "@/lib/settings";

type PlanSeed = typeof plans.$inferInsert;

// Placeholder prices — first draft, like the rest of the copy. Edit them in
// /admin/catalogue.
const CATALOGUE: PlanSeed[] = [
  {
    slug: "vps-essentiel",
    name: "VPS Essentiel",
    description: "Un serveur virtuel pour une application, un site ou un environnement de test.",
    category: "infrastructure",
    priceCents: 4_500_00,
    billingPeriod: "monthly",
    specs: { vCPU: "2", RAM: "4 Go", Stockage: "80 Go SSD", "Bande passante": "2 To" },
    features: ["IPv4 dédiée", "Sauvegarde hebdomadaire", "Accès SSH root"],
    defaultQuotas: { "bandwidth.gb": 2000 },
    sortOrder: 1,
  },
  {
    slug: "vps-performance",
    name: "VPS Performance",
    description: "Pour une application en production avec un trafic soutenu.",
    category: "infrastructure",
    priceCents: 11_000_00,
    billingPeriod: "monthly",
    specs: { vCPU: "4", RAM: "8 Go", Stockage: "200 Go SSD", "Bande passante": "5 To" },
    features: ["IPv4 dédiée", "Sauvegarde quotidienne, rétention 30 jours", "Supervision 24/7"],
    defaultQuotas: { "bandwidth.gb": 5000 },
    sortOrder: 2,
  },
  {
    slug: "cloud-sur-mesure",
    name: "Infrastructure cloud sur mesure",
    description: "Architecture dimensionnée avec vous : haute disponibilité, réseau privé, migration.",
    category: "infrastructure",
    priceCents: null,
    billingPeriod: "monthly",
    specs: {},
    features: ["Étude et dimensionnement", "SLA contractuel", "Accompagnement à la migration"],
    defaultQuotas: {},
    sortOrder: 3,
  },
  {
    slug: "smtp-50k",
    name: "SMTP dédié — 50 000 envois",
    description: "Un relais SMTP authentifié à votre nom de domaine, avec SPF, DKIM et DMARC.",
    category: "addon",
    priceCents: 3_000_00,
    billingPeriod: "monthly",
    specs: { Envois: "50 000 / mois", Domaine: "Le vôtre" },
    features: ["Réputation d'envoi surveillée", "Journaux de délivrabilité"],
    defaultQuotas: { "smtp.emails": 50_000 },
    sortOrder: 10,
  },
  {
    slug: "ai-api",
    name: "API IA — 100 000 requêtes",
    description: "Accès à nos modèles (extraction, classification, génération) par une API unique.",
    category: "addon",
    priceCents: 8_000_00,
    billingPeriod: "monthly",
    specs: { Requêtes: "100 000 / mois" },
    features: ["Clé d'API dédiée", "Tableau de consommation"],
    defaultQuotas: { "ai.requests": 100_000 },
    sortOrder: 11,
  },
  {
    slug: "sms-10k",
    name: "SMS — 10 000 messages",
    description: "Envoi de SMS transactionnels (codes, notifications) avec votre nom d'expéditeur.",
    category: "addon",
    priceCents: 6_000_00,
    billingPeriod: "one_off",
    specs: { Messages: "10 000" },
    features: ["Nom d'expéditeur personnalisé", "Accusés de réception"],
    defaultQuotas: { "sms.messages": 10_000 },
    sortOrder: 12,
  },
  {
    slug: "stockage-100",
    name: "Stockage — 100 Go",
    description: "Espace de stockage objet compatible S3 pour vos fichiers et sauvegardes.",
    category: "addon",
    priceCents: 1_500_00,
    billingPeriod: "monthly",
    specs: { Capacité: "100 Go" },
    features: ["Compatible S3", "Liens de téléchargement temporaires"],
    defaultQuotas: { "storage.mb": 100_000 },
    sortOrder: 13,
  },
  {
    slug: "infogerance",
    name: "Infogérance",
    description: "Nous exploitons vos serveurs : mises à jour, supervision, astreinte.",
    category: "support",
    priceCents: null,
    billingPeriod: "monthly",
    specs: {},
    features: ["Mises à jour de sécurité", "Astreinte", "Rapport mensuel"],
    defaultQuotas: {},
    sortOrder: 20,
  },
];

const RETIRED = ["decouverte", "pro", "entreprise"];

async function main() {
  for (const plan of CATALOGUE) {
    await db
      .insert(plans)
      .values(plan)
      .onConflictDoUpdate({ target: plans.slug, set: plan });
  }
  await db.update(plans).set({ active: false }).where(inArray(plans.slug, RETIRED));

  // Every account used to be handed a free "Découverte" subscription on sign-up.
  // That was a platform tier, not a sale, and it would now show in "Mes
  // services" as a live service the customer never bought. Mark those as
  // cancelled — kept, visible under "résiliés", and reversible from the admin.
  const closed = await db
    .update(subscriptions)
    .set({ status: "cancelled", note: "Ancienne formule plateforme (Découverte), clôturée à la refonte des services.", updatedAt: new Date() })
    .where(and(eq(subscriptions.planSlug, "decouverte"), eq(subscriptions.status, "active")))
    .returning({ id: subscriptions.id });
  if (closed.length) console.info(`closed ${closed.length} legacy Découverte subscriptions`);
  console.info(`seeded ${CATALOGUE.length} catalogue entries, retired ${RETIRED.length} old tiers`);

  for (const key of SETTING_KEYS) {
    await db
      .insert(appSettings)
      .values({ key, value: DEFAULT_SETTINGS[key] })
      // Only fills in what's missing — an admin's choice is never overwritten
      // by re-running the seed.
      .onConflictDoNothing({ target: appSettings.key });
  }
  console.info(`ensured ${SETTING_KEYS.length} settings`);
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
