import { asc } from "drizzle-orm";
import { unstable_cache } from "next/cache";
import { db } from "@/lib/db";
import { siteContent, siteSolutions } from "@/lib/db/schema";
import { applyMedia } from "@/lib/data/media";
import type { Service } from "@/lib/types";
import {
  BLOCK_SCHEMAS,
  SECTION_KEYS,
  SolutionContentSchema,
  SolutionMediaSchema,
  type BlockKey,
  type SiteContent,
} from "./schema";
import {
  DEFAULT_SITE_CONTENT,
  DEFAULT_SOLUTIONS,
  type SolutionRecord,
} from "./defaults";

/**
 * Reads of the editable public-site content. Server only (it imports the pool).
 *
 * Both reads are wrapped in `unstable_cache` and tagged, so the marketing pages stay
 * statically generated and never query per visit; the /admin/site actions call
 * `updateTag` on save, which is what makes an edit show up at once.
 *
 * Every read degrades to the code defaults rather than failing: no database (CI
 * builds), tables not migrated yet, or a stored block that no longer matches its
 * schema. The site can always render.
 */

export const SITE_CONTENT_TAG = "site-content";
export const SITE_SOLUTIONS_TAG = "site-solutions";

/* ───────────────────────────── Merging ───────────────────────────── */

const isPlainObject = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null && !Array.isArray(v);

/**
 * `stored` over `base`, key by key. Arrays replace wholesale (a list the owner
 * shortened must stay short); objects merge, so a field added to the defaults in
 * code after a block was saved still gets its default value.
 */
export function mergeOver<T>(base: T, stored: unknown): T {
  if (!isPlainObject(base) || !isPlainObject(stored)) {
    return (stored === undefined ? base : stored) as T;
  }
  const out: Record<string, unknown> = { ...base };
  for (const [key, value] of Object.entries(stored)) {
    if (value === undefined) continue;
    out[key] = key in base ? mergeOver((base as Record<string, unknown>)[key], value) : value;
  }
  return out as T;
}

function defaultBlock(key: BlockKey): unknown {
  if (key === "general" || key === "hero" || key === "footer") return DEFAULT_SITE_CONTENT[key];
  return DEFAULT_SITE_CONTENT.sections[key];
}

/** A stored block merged over its default and validated; the default if it fails. */
export function resolveBlock(key: BlockKey, stored: unknown): unknown {
  const base = defaultBlock(key);
  if (stored === undefined) return base;
  const parsed = BLOCK_SCHEMAS[key].safeParse(mergeOver(base, stored));
  if (!parsed.success) {
    console.warn(`[site-content] bloc « ${key} » invalide, valeur par défaut utilisée`);
    return base;
  }
  return parsed.data;
}

function assemble(rows: { key: string; value: unknown }[]): SiteContent {
  const stored = new Map(rows.map((r) => [r.key, r.value]));
  const sections = {} as Record<string, unknown>;
  for (const key of SECTION_KEYS) sections[key] = resolveBlock(key, stored.get(key));
  return {
    general: resolveBlock("general", stored.get("general")) as SiteContent["general"],
    hero: resolveBlock("hero", stored.get("hero")) as SiteContent["hero"],
    footer: resolveBlock("footer", stored.get("footer")) as SiteContent["footer"],
    sections: sections as SiteContent["sections"],
  };
}

/* ───────────────────────────── Uncached reads (admin) ───────────────────────────── */

type ContentRow = { key: string; value: unknown };

/** The raw stored blocks. This, not the assembled result, is what gets cached. */
async function loadContentRows(): Promise<ContentRow[]> {
  return db.select({ key: siteContent.key, value: siteContent.value }).from(siteContent);
}

async function loadSiteContent(): Promise<SiteContent> {
  return assemble(await loadContentRows());
}

/** Every block, merged over defaults. Uncached: the editor must see its own saves. */
export async function readSiteContent(): Promise<SiteContent> {
  try {
    return await loadSiteContent();
  } catch {
    return DEFAULT_SITE_CONTENT;
  }
}

/** When each block was last saved, for the admin overview. */
export async function readContentUpdates(): Promise<Map<string, Date>> {
  try {
    const rows = await db
      .select({ key: siteContent.key, updatedAt: siteContent.updatedAt })
      .from(siteContent);
    return new Map(rows.map((r) => [r.key, r.updatedAt]));
  } catch {
    return new Map();
  }
}

function toRecord(row: typeof siteSolutions.$inferSelect): SolutionRecord | null {
  const fallback = DEFAULT_SOLUTIONS.find((d) => d.slug === row.slug);
  const content = SolutionContentSchema.safeParse(
    fallback ? mergeOver(fallback.content, row.content) : row.content,
  );
  const media = SolutionMediaSchema.safeParse(
    mergeOver(fallback?.media ?? DEFAULT_SOLUTIONS[0].media, row.media),
  );
  if (!content.success || !media.success) {
    console.warn(`[site-content] solution « ${row.slug} » invalide, ignorée`);
    return null;
  }
  return {
    id: row.id,
    slug: row.slug,
    position: row.position,
    published: row.published,
    content: content.data,
    media: media.data,
  };
}

/**
 * Every solution record, hidden ones included, in order. An empty table means the
 * owner has never edited one: the code defaults are returned (with `id: null`).
 */
/** The raw stored rows. This, not the parsed records, is what gets cached. */
async function loadSolutionRows() {
  return db.select().from(siteSolutions).orderBy(asc(siteSolutions.position), asc(siteSolutions.id));
}

function assembleSolutions(
  rows: (typeof siteSolutions.$inferSelect)[],
): { records: SolutionRecord[]; fromDefaults: boolean } {
  if (rows.length === 0) return { records: DEFAULT_SOLUTIONS, fromDefaults: true };
  return { records: rows.map(toRecord).filter((r): r is SolutionRecord => r !== null), fromDefaults: false };
}

async function loadSolutionRecords(): Promise<{ records: SolutionRecord[]; fromDefaults: boolean }> {
  return assembleSolutions(await loadSolutionRows());
}

export async function readSolutionRecords(): Promise<{ records: SolutionRecord[]; fromDefaults: boolean }> {
  try {
    return await loadSolutionRecords();
  } catch {
    return { records: DEFAULT_SOLUTIONS, fromDefaults: true };
  }
}

/** A record as the `Service` every component renders. */
export function toService(record: SolutionRecord): Service {
  const { content } = record;
  const base: Service = {
    ...content,
    subProjects: content.subProjects.length ? content.subProjects : undefined,
    media: {
      hero: { ...content.media.hero },
      gallery: content.media.gallery.map((slot) => ({ ...slot })),
    },
  };
  return applyMedia(base, record.media);
}

/* ───────────────────────────── Cached reads (public site) ───────────────────────────── */

/*
 * The cached functions use the *throwing* loaders, and the fallback sits outside the
 * cache: `unstable_cache` doesn't store a thrown result, so a database outage (or a
 * build with no database) serves the defaults without pinning them in the cache for
 * the next hour.
 *
 * **Only the raw database rows are cached — the merge over the defaults and the Zod
 * parse happen on every read.** Caching the assembled result instead means a deploy that
 * adds a field to the content model serves `undefined` for that field until the entry
 * expires (an hour) or someone saves in /admin/site, because the cached object was
 * assembled against the *old* defaults. That shipped once and rendered a `NaN` into a
 * grid template. Assembling is a deep merge and a parse of a few KB of JSON, so it costs
 * nothing next to the round trip the cache is there to avoid.
 */

const cachedContentRows = unstable_cache(loadContentRows, ["site-content"], {
  tags: [SITE_CONTENT_TAG],
  revalidate: 3600,
});

/** The whole editable site copy. Cached and tagged; see the file note. */
export async function getSiteContent(): Promise<SiteContent> {
  try {
    return assemble(await cachedContentRows());
  } catch {
    return DEFAULT_SITE_CONTENT;
  }
}

const cachedSolutionRows = unstable_cache(loadSolutionRows, ["site-solutions"], {
  tags: [SITE_SOLUTIONS_TAG],
  revalidate: 3600,
});

/** The solutions the public site shows, in order. Hidden ones only on request. */
export async function getSolutions(opts: { includeHidden?: boolean } = {}): Promise<Service[]> {
  let records: SolutionRecord[];
  try {
    records = assembleSolutions(await cachedSolutionRows()).records;
  } catch {
    records = DEFAULT_SOLUTIONS;
  }
  return records.filter((r) => opts.includeHidden || r.published).map(toService);
}

export async function getSolution(slug: string): Promise<Service | undefined> {
  return (await getSolutions()).find((s) => s.slug === slug);
}
