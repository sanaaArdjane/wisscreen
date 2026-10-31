import { describe, expect, it } from "vitest";
import { checkUseCase, isUseCasePublishable, publishableUseCases, similarity } from "@/lib/content/usecases";
import type { UseCaseContent } from "@/lib/content/schema";

const blankSeo = { title: "", description: "", ogImage: "", canonical: "", noindex: false };

function make(over: Partial<UseCaseContent> = {}): UseCaseContent {
  return {
    slug: "extraction-factures",
    title: "Extraire les données d'une facture",
    intro: "A".repeat(400),
    problems: ["un", "deux", "trois"],
    benefits: ["un", "deux", "trois"],
    proof: "B".repeat(200),
    faq: [],
    seo: blankSeo,
    ...over,
  };
}

describe("la règle de publication des cas d'usage", () => {
  it("publie un cas complet", () => {
    expect(checkUseCase(make())).toEqual([]);
    expect(isUseCasePublishable(make())).toBe(true);
  });

  it("dit combien de caractères manquent, plutôt que « trop court »", () => {
    const [issue] = checkUseCase(make({ intro: "A".repeat(220) }));
    // The number is the whole point of the message: it is an instruction, not a verdict.
    expect(issue).toContain("180");
  });

  it("exige trois problèmes et trois bénéfices, les lignes vides ne comptant pas", () => {
    expect(checkUseCase(make({ problems: ["un", "deux", "   "] }))).toHaveLength(1);
    expect(checkUseCase(make({ benefits: [] }))).toHaveLength(1);
  });

  it("refuse un gabarit recopié d'un cas voisin", () => {
    // The real shape of the problem: one page duplicated and one noun swapped.
    const template =
      "Les factures fournisseurs arrivent en PDF, par courriel ou scannées au guichet. " +
      "Quelqu'un les ressaisit ligne à ligne dans l'outil comptable, ce qui occupe une " +
      "demi-journée par semaine et introduit des écarts que personne ne retrouve avant " +
      "la clôture. Le service financier réclame un contrôle, la direction réclame des " +
      "délais, et les deux demandes se contredisent tant que la saisie reste manuelle.";
    const first = make({ intro: template, proof: template.slice(0, 260) });
    const second = make({
      slug: "extraction-bons",
      title: "Extraire les données d'un bon",
      // The whole page copied, with one noun swapped — exactly what the rule is for.
      intro: template.replaceAll("factures", "bons"),
      proof: template.replaceAll("factures", "bons").slice(0, 260),
    });
    const issues = checkUseCase(second, [first, second]);
    expect(issues.some((i) => i.includes("identique"))).toBe(true);
    // The duplicate drops out everywhere at once, which is what the route and the
    // sitemap both read.
    expect(publishableUseCases([first, second]).map((u) => u.slug)).toEqual([]);
  });

  it("laisse passer deux cas réellement différents", () => {
    const first = make({ intro: "Les factures fournisseurs arrivent en PDF. ".repeat(12) });
    const second = make({
      slug: "controle-identite",
      title: "Vérifier une pièce d'identité",
      intro: "Un guichet doit confirmer qu'une carte nationale est authentique. ".repeat(10),
      proof: "Déployé dans trois agences bancaires depuis janvier. ".repeat(6),
    });
    expect(publishableUseCases([first, second])).toHaveLength(2);
  });

  it("mesure la similarité sans tenir compte des accents ni de la casse", () => {
    expect(similarity("Déployé à Alger", "deploye a alger")).toBe(1);
    expect(similarity("", "quoi que ce soit")).toBe(0);
  });
});
