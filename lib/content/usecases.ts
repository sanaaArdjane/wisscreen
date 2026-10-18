import type { UseCaseContent } from "./schema";

/**
 * Whether a "solution × cas d'usage" page is substantial enough to exist.
 *
 * (The functions are `checkUseCase` / `isUseCasePublishable` rather than the more
 * natural `useCaseIssues`: a name starting with `use` is a hook as far as the React
 * lint is concerned, and this one is called inside a `.map` in the editor.)
 *
 * Programmatic pages are how a site goes from five URLs to fifty, and also how it
 * earns a thin-content penalty: twenty pages that differ by one noun are worth less
 * than nothing, because they drag the whole domain down with them. So the rule is a
 * **single exported predicate**, consumed by `generateStaticParams`, the sitemap and
 * the editor alike — one definition, and no way for the three to disagree about which
 * pages exist.
 *
 * A page that fails is absent everywhere and its URL 404s. It is not hidden: a page
 * that is linked but refuses to be indexed is the worst of both.
 *
 * **The verdict is shown in the editor**, in these words. A rule nobody can see is a
 * rule people fight — "why has my page vanished?" — whereas "il manque 180 caractères
 * d'introduction" is an instruction.
 *
 * The thresholds are deliberately modest. They do not make a page good; they only
 * exclude the page that was never written.
 */
const MIN_INTRO = 400;
const MIN_PROOF = 200;
const MIN_ITEMS = 3;
/** Above this, two sibling pages are the same page with words swapped. */
const MAX_SIMILARITY = 0.85;

const length = (value: string) => value.trim().length;

/** Trigrams of the normalised text — accents and punctuation dropped. */
function trigrams(text: string): Set<string> {
  const flat = text
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
  const out = new Set<string>();
  for (let i = 0; i + 3 <= flat.length; i++) out.add(flat.slice(i, i + 3));
  return out;
}

/**
 * Jaccard overlap of two texts' trigrams, 0 to 1.
 *
 * Trigrams rather than words because the duplication this catches is a template with
 * one noun swapped, where nearly every *word* already matches. No dependency: a set
 * intersection is four lines.
 */
export function similarity(a: string, b: string): number {
  const left = trigrams(a);
  const right = trigrams(b);
  if (left.size === 0 || right.size === 0) return 0;
  let shared = 0;
  for (const gram of left) if (right.has(gram)) shared++;
  return shared / (left.size + right.size - shared);
}

/** All of a use case's text, for the similarity check. */
function corpus(useCase: UseCaseContent): string {
  return [useCase.title, useCase.intro, ...useCase.problems, ...useCase.benefits, useCase.proof].join(" ");
}

/**
 * Why this use case cannot be published yet, in French, ready to display.
 *
 * `siblings` are the other use cases of the **same solution**: duplication across two
 * different solutions is normal (the same problem, solved differently), duplication
 * inside one is a template.
 */
export function checkUseCase(useCase: UseCaseContent, siblings: UseCaseContent[] = []): string[] {
  const issues: string[] = [];

  const intro = length(useCase.intro);
  if (intro < MIN_INTRO) {
    issues.push(`Introduction trop courte : il manque ${MIN_INTRO - intro} caractères (${intro} / ${MIN_INTRO}).`);
  }
  if (useCase.problems.filter(length).length < MIN_ITEMS) {
    issues.push(`Il faut au moins ${MIN_ITEMS} problèmes décrits.`);
  }
  if (useCase.benefits.filter(length).length < MIN_ITEMS) {
    issues.push(`Il faut au moins ${MIN_ITEMS} bénéfices décrits.`);
  }
  const proof = length(useCase.proof);
  if (proof < MIN_PROOF) {
    issues.push(`Preuve trop courte : il manque ${MIN_PROOF - proof} caractères (${proof} / ${MIN_PROOF}).`);
  }

  const mine = corpus(useCase);
  for (const other of siblings) {
    if (other.slug === useCase.slug) continue;
    if (similarity(mine, corpus(other)) >= MAX_SIMILARITY) {
      issues.push(`Texte presque identique à « ${other.title || other.slug} » : réécrivez-le ou fusionnez les deux.`);
      break;
    }
  }

  return issues;
}

export function isUseCasePublishable(useCase: UseCaseContent, siblings: UseCaseContent[] = []): boolean {
  return checkUseCase(useCase, siblings).length === 0;
}

/** The use cases of one solution that are allowed to be pages. */
export function publishableUseCases(useCases: UseCaseContent[]): UseCaseContent[] {
  return useCases.filter((useCase) => isUseCasePublishable(useCase, useCases));
}
