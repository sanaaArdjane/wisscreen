import { SERVICES } from "@/lib/data/services";

/**
 * The sandbox behind /dashboard/demos.
 *
 * **These are simulated runs.** There is no OCR engine, payment scorer or
 * catalogue service wired in yet, so each scenario returns a plausible,
 * clearly-labelled sample built from the caller's own input. Every surface that
 * renders a result says so — a demo that silently fakes an answer is worse than
 * no demo, because someone will quote the number in a meeting.
 *
 * What is real is everything around it: the quota is spent, the run is recorded
 * in `demo_runs`, and the admin sees it. Replacing this file with real API calls
 * is the only change needed when the engines exist — the shape of `DemoResult`
 * is the contract.
 */

export type DemoField = { label: string; value: string; confidence?: number };

export type DemoResult = {
  summary: string;
  fields: DemoField[];
  /** Always true today. A real engine sets it false. */
  simulated: true;
};

export type DemoScenario = {
  slug: string;
  name: string;
  title: string;
  description: string;
  /** What the input box asks for. */
  inputLabel: string;
  inputPlaceholder: string;
  /** Pre-filled example, so a demo is one click away from a cold start. */
  sample: string;
  run: (input: string) => DemoResult;
};

/** A tiny deterministic hash, so the same input always scores the same. */
function hash(value: string): number {
  let h = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    h ^= value.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}

/** A confidence in [0.82, 0.99], stable for a given input+field. */
function confidence(input: string, salt: string): number {
  return 0.82 + ((hash(input + salt) % 170) / 1000);
}

function serviceName(slug: string): string {
  return SERVICES.find((s) => s.slug === slug)?.name ?? slug;
}

export const DEMO_SCENARIOS: DemoScenario[] = [
  {
    slug: "ocr",
    name: serviceName("ocr"),
    title: "Extraction de données",
    description:
      "Collez le texte brut d'un document (pièce d'identité, facture, formulaire) et voyez les champs que le moteur isole.",
    inputLabel: "Texte du document",
    inputPlaceholder: "CARTE NATIONALE D'IDENTITÉ\nNom : BENALI\nPrénom : Amina\n…",
    sample:
      "CARTE NATIONALE D'IDENTITÉ\nNom : BENALI\nPrénom : Amina\nNé(e) le : 14/03/1991\nN° : 1091 4455 0912\nValable jusqu'au : 09/2031\nAdresse : 12 rue Didouche Mourad, Alger",
    run: (input) => {
      const lines = input
        .split("\n")
        .map((l) => l.trim())
        .filter(Boolean);
      // Anything shaped "Label : value" is treated as a detected field; the rest
      // is reported as unstructured, which is what a real engine would also say.
      const pairs = lines
        .map((line) => /^(.{2,40}?)\s*[:：]\s*(.+)$/.exec(line))
        .filter((m): m is RegExpExecArray => m !== null)
        .slice(0, 8);

      const fields: DemoField[] = pairs.map((m) => ({
        label: m[1],
        value: m[2],
        confidence: confidence(input, m[1]),
      }));

      if (fields.length === 0) {
        fields.push({
          label: "Texte brut",
          value: input.slice(0, 160) || "(vide)",
          confidence: confidence(input, "raw"),
        });
      }

      return {
        summary: `${fields.length} champ${fields.length > 1 ? "s" : ""} isolé${fields.length > 1 ? "s" : ""} sur ${lines.length} ligne${lines.length > 1 ? "s" : ""}.`,
        fields,
        simulated: true,
      };
    },
  },
  {
    slug: "wifacility",
    name: serviceName("wifacility"),
    title: "Simulation de paiement échelonné",
    description:
      "Saisissez un montant en dinars et obtenez l'échéancier que le moteur proposerait au client.",
    inputLabel: "Montant de l'achat (DZD)",
    inputPlaceholder: "180000",
    sample: "180000",
    run: (input) => {
      const amount = Math.max(0, Math.round(Number(input.replace(/[^\d.]/g, "")) || 0));
      const months = amount >= 300_000 ? 12 : amount >= 120_000 ? 6 : 3;
      const rate = 0.02;
      const total = Math.round(amount * (1 + rate));
      const monthly = Math.round(total / months);
      const score = 55 + (hash(input) % 45);

      return {
        summary: `${months} mensualités de ${monthly.toLocaleString("fr-FR")} DZD.`,
        fields: [
          { label: "Montant financé", value: `${amount.toLocaleString("fr-FR")} DZD` },
          { label: "Durée proposée", value: `${months} mois` },
          { label: "Mensualité", value: `${monthly.toLocaleString("fr-FR")} DZD` },
          { label: "Coût total", value: `${total.toLocaleString("fr-FR")} DZD` },
          { label: "Score du dossier", value: `${score} / 100` },
          {
            label: "Décision indicative",
            value: score >= 70 ? "Accord de principe" : "Examen manuel requis",
          },
        ],
        simulated: true,
      };
    },
  },
  {
    slug: "wicloud",
    name: serviceName("wicloud"),
    title: "Dimensionnement d'infrastructure",
    description:
      "Indiquez une charge estimée (requêtes par minute) et voyez les ressources que la console provisionnerait.",
    inputLabel: "Requêtes par minute",
    inputPlaceholder: "12000",
    sample: "12000",
    run: (input) => {
      const rpm = Math.max(1, Math.round(Number(input.replace(/[^\d]/g, "")) || 0));
      const instances = Math.max(2, Math.ceil(rpm / 4000));
      const storage = Math.max(20, Math.ceil(rpm / 100));
      return {
        summary: `${instances} instances, montée automatique jusqu'à ${instances * 3}.`,
        fields: [
          { label: "Charge simulée", value: `${rpm.toLocaleString("fr-FR")} req/min` },
          { label: "Instances de base", value: String(instances) },
          { label: "Plafond d'autoscaling", value: String(instances * 3) },
          { label: "Stockage bloc", value: `${storage} Go` },
          { label: "Disponibilité cible", value: "99,95 %" },
          { label: "Sauvegardes", value: "Quotidiennes, rétention 30 jours" },
        ],
        simulated: true,
      };
    },
  },
  {
    slug: "setycore",
    name: serviceName("setycore"),
    title: "Fiche produit marketplace",
    description:
      "Décrivez un produit et voyez la fiche que la marketplace en tire, prix échelonné compris.",
    inputLabel: "Produit et prix",
    inputPlaceholder: "Réfrigérateur 400L inox — 145000 DZD",
    sample: "Réfrigérateur 400L inox — 145000 DZD",
    run: (input) => {
      const price = Math.round(Number(input.replace(/[^\d]/g, "").slice(-8)) || 0);
      const label = input.split(/[—-]/)[0]?.trim() || "Produit";
      const months = price >= 120_000 ? 6 : 3;
      return {
        summary: `Fiche générée pour « ${label} ».`,
        fields: [
          { label: "Intitulé", value: label },
          { label: "Prix comptant", value: `${price.toLocaleString("fr-FR")} DZD` },
          {
            label: "Paiement échelonné",
            value: price
              ? `${months} × ${Math.round((price * 1.02) / months).toLocaleString("fr-FR")} DZD`
              : "—",
          },
          { label: "Catégorie détectée", value: hash(label) % 2 ? "Électroménager" : "Maison" },
          { label: "Disponibilité", value: "En stock" },
        ],
        simulated: true,
      };
    },
  },
];

export function getScenario(slug: string): DemoScenario | undefined {
  return DEMO_SCENARIOS.find((s) => s.slug === slug);
}
