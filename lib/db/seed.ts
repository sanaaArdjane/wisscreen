/**
 * Idempotent seed: the three plans and the default platform settings.
 *
 * Run with `pnpm db:seed`. Everything upserts, so running it again after a plan
 * edit re-applies the defaults rather than erroring — and it deliberately does
 * **not** create the admin account. That happens on first sign-up with
 * `ADMIN_EMAIL`, handled by the `databaseHooks.user.create.before` in
 * `lib/auth.ts`, so there is never a seeded password sitting in the repo.
 */
import { db } from "@/lib/db";
import { plans, appSettings } from "@/lib/db/schema";
import { DEFAULT_SETTINGS, SETTING_KEYS } from "@/lib/settings";

type PlanSeed = typeof plans.$inferInsert;

// Annotated, not inferred: without it TypeScript widens each object's
// `defaultQuotas` to its own literal shape, and the union of three different
// shapes doesn't satisfy `Record<string, number>`.
const PLANS: PlanSeed[] = [
  {
    slug: "decouverte",
    name: "Découverte",
    description:
      "Pour évaluer nos solutions : accès aux démos, dépôt de demandes et suivi de vos dossiers.",
    priceCents: 0,
    features: [
      "5 demandes par mois",
      "20 exécutions de démo par mois",
      "500 Mo de documents",
      "Support par e-mail",
    ],
    defaultQuotas: { "requests.monthly": 5, "demo.runs": 20, "storage.mb": 500 },
    sortOrder: 1,
  },
  {
    slug: "pro",
    name: "Pro",
    description:
      "Pour une équipe qui exploite nos solutions au quotidien, avec un interlocuteur dédié.",
    priceCents: null,
    features: [
      "50 demandes par mois",
      "500 exécutions de démo par mois",
      "20 Go de documents",
      "Devis et facturation en ligne",
      "Support prioritaire",
    ],
    defaultQuotas: { "requests.monthly": 50, "demo.runs": 500, "storage.mb": 20_000 },
    sortOrder: 2,
  },
  {
    slug: "entreprise",
    name: "Entreprise",
    description:
      "Volume illimité, engagement de service contractuel et accompagnement à la migration.",
    priceCents: null,
    features: [
      "Demandes illimitées",
      "Démos illimitées",
      "Stockage sur mesure",
      "SLA 99,95 %",
      "Équipe d'intégration dédiée",
    ],
    // A metric absent from this map is unlimited — see `lib/quotas.ts`.
    defaultQuotas: { "storage.mb": 200_000 },
    sortOrder: 3,
  },
];

async function main() {
  for (const plan of PLANS) {
    await db
      .insert(plans)
      .values(plan)
      .onConflictDoUpdate({ target: plans.slug, set: plan });
  }
  console.info(`seeded ${PLANS.length} plans`);

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
