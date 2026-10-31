import { describe, expect, it } from "vitest";
import { mergeOver } from "@/lib/content";
import { DEFAULT_SOLUTIONS, blankSeo } from "@/lib/content/defaults";
import { SolutionContentSchema } from "@/lib/content/schema";
import { resolveSeo } from "@/lib/seo/metadata";

/**
 * The two branches of the SEO work that fail quietly if they regress.
 *
 * Everything else here is either visible (a wrong title shows up) or already covered
 * by the type checker. These two are not: one makes a page vanish from the site with
 * only a `console.warn`, the other makes a page vanish from Google.
 */

describe("un champ ajouté au schéma ne fait pas disparaître une solution", () => {
  /*
   * This is the single highest-risk thing in the content model.
   *
   * `toRecord()` parses each stored row and, on failure, logs a warning and returns
   * `null` — the solution simply stops being rendered. Rows saved before a new
   * required key existed don't carry it, so the key only survives because
   * `mergeOver()` backfills it from the code default first.
   *
   * The test fakes exactly that: a row shaped like one saved before `seo` was added.
   */
  const stored = structuredClone(DEFAULT_SOLUTIONS[0].content) as Record<string, unknown>;
  delete stored.seo;

  it("une ligne enregistrée avant l'ajout de `seo` se relit", () => {
    const merged = mergeOver(DEFAULT_SOLUTIONS[0].content, stored);
    const parsed = SolutionContentSchema.safeParse(merged);

    expect(parsed.success).toBe(true);
    expect(parsed.success && parsed.data.seo).toEqual(blankSeo());
  });

  it("sans la fusion sur les défauts, la même ligne échoue — c'est bien la fusion qui protège", () => {
    expect(SolutionContentSchema.safeParse(stored).success).toBe(false);
  });
});

describe("resolveSeo — la chaîne de repli", () => {
  const base = {
    fallbackTitle: "OCR",
    fallbackDescription: "Extraction automatique des données d'un document.",
    path: "/solutions/ocr",
  };

  it("sans surcharge, reprend la copie éditoriale", () => {
    const seo = resolveSeo({ ...base, seo: blankSeo() });
    expect(seo.title).toBe("OCR");
    expect(seo.description).toBe("Extraction automatique des données d'un document.");
    expect(seo.canonical).toBe("/solutions/ocr");
    expect(seo.robots).toBeNull();
  });

  it("une chaîne vide retombe comme un champ absent", () => {
    // C'est ce que laisse un propriétaire qui efface le champ : `??` le garderait.
    expect(resolveSeo({ ...base, seo: { title: "" } }).title).toBe("OCR");
    expect(resolveSeo({ ...base, seo: undefined }).title).toBe("OCR");
  });

  it("une surcharge remplie gagne", () => {
    const seo = resolveSeo({
      ...base,
      seo: { title: "OCR pour factures fournisseurs", canonical: "/solutions/ocr-factures" },
    });
    expect(seo.title).toBe("OCR pour factures fournisseurs");
    expect(seo.canonical).toBe("/solutions/ocr-factures");
  });

  it("un noindex de page garde follow — sinon on orpheline ses liens internes", () => {
    expect(resolveSeo({ ...base, seo: { noindex: true } }).robots).toEqual({
      index: false,
      follow: true,
    });
  });

  it("le frein global écrase tout, liens compris", () => {
    expect(resolveSeo({ ...base, seo: blankSeo(), siteNoindex: true }).robots).toEqual({
      index: false,
      follow: false,
    });
  });
});
