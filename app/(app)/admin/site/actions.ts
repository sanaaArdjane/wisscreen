"use server";

import { and, asc, eq, ne, sql } from "drizzle-orm";
import { revalidatePath, updateTag } from "next/cache";
import { redirect } from "next/navigation";
import type { z } from "zod";
import { db } from "@/lib/db";
import { siteContent, sitePosts, siteSolutions } from "@/lib/db/schema";
import { requirePermission } from "@/lib/guard";
import { logActivity } from "@/lib/account";
import { fail, succeed, type ActionState } from "@/lib/actions";
import {
  BLOCK_SCHEMAS,
  PostContentSchema,
  SlugSchema,
  SolutionContentSchema,
  SolutionMediaSchema,
  type BlockKey,
} from "@/lib/content/schema";
import { DEFAULT_SOLUTIONS, blankPost, blankSolution } from "@/lib/content/defaults";
import { SITE_CONTENT_TAG, SITE_SOLUTIONS_TAG } from "@/lib/content";
import { flash } from "@/lib/flash";
import { SITE_POSTS_TAG } from "@/lib/content/posts";

/**
 * Everything /admin/site writes. Each action re-checks `site:write` — an action is a
 * public endpoint, and the page having rendered the button is not an authorization.
 *
 * After a write: `updateTag` expires the cached reads *immediately* (read-your-own-
 * writes — the owner reloads the site and sees the change), and `revalidatePath` on the
 * marketing layout drops the statically generated pages built from them.
 */

const SAVED = "Enregistré — c'est en ligne. Rechargez le site pour le voir.";

function refreshSite(tag: string) {
  updateTag(tag);
  revalidatePath("/", "layout");
  // The editors themselves: a reset or a reorder must show up on the admin page too.
  revalidatePath("/admin/site", "layout");
}

/** Zod issues → `fieldErrors` keyed by the dotted path the form renderer uses. */
function issuesToErrors(error: z.ZodError, prefix = ""): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = prefix + issue.path.join(".");
    out[key || "_"] ??= issue.message;
  }
  return out;
}

function readJson(formData: FormData, name: string): unknown {
  const raw = formData.get(name);
  if (typeof raw !== "string") return undefined;
  try {
    return JSON.parse(raw);
  } catch {
    return undefined;
  }
}

/* ───────────────────────────── Content blocks ───────────────────────────── */

export async function saveBlock(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const staff = await requirePermission("site:write");
  const key = formData.get("key");
  if (typeof key !== "string" || !(key in BLOCK_SCHEMAS)) return fail("Bloc inconnu.");

  const parsed = BLOCK_SCHEMAS[key as BlockKey].safeParse(readJson(formData, "value"));
  if (!parsed.success) {
    return { ok: false, message: "Certains champs sont invalides — voir en rouge.", fieldErrors: issuesToErrors(parsed.error) };
  }

  await db
    .insert(siteContent)
    .values({ key, value: parsed.data, updatedById: staff.id })
    .onConflictDoUpdate({
      target: siteContent.key,
      set: { value: parsed.data, updatedById: staff.id, updatedAt: new Date() },
    });
  await logActivity({ actorId: staff.id, action: "site.content_updated", entity: "site_content", entityId: key });
  refreshSite(SITE_CONTENT_TAG);
  return succeed(SAVED);
}

/** Drops the stored block: the section goes back to the text shipped in code. */
export async function resetBlock(formData: FormData): Promise<void> {
  const staff = await requirePermission("site:write");
  const key = formData.get("key");
  if (typeof key !== "string" || !(key in BLOCK_SCHEMAS)) return;
  await db.delete(siteContent).where(eq(siteContent.key, key));
  await logActivity({ actorId: staff.id, action: "site.content_reset", entity: "site_content", entityId: key });
  refreshSite(SITE_CONTENT_TAG);
  await flash("Bloc réinitialisé aux valeurs par défaut.");
}

/* ───────────────────────────── Solutions ───────────────────────────── */

/**
 * The table starts empty (the site uses the code defaults until then). The first write
 * of any kind copies the four defaults in, so every later operation works on rows.
 */
async function ensureSeeded(userId: string) {
  const [{ n }] = await db.select({ n: sql<number>`count(*)::int` }).from(siteSolutions);
  if (n > 0) return;
  await db
    .insert(siteSolutions)
    .values(
      DEFAULT_SOLUTIONS.map((d) => ({
        slug: d.slug,
        position: d.position,
        published: d.published,
        content: d.content,
        media: d.media,
        updatedById: userId,
      })),
    )
    .onConflictDoNothing();
}

async function orderedRows() {
  return db
    .select({ id: siteSolutions.id, slug: siteSolutions.slug, position: siteSolutions.position })
    .from(siteSolutions)
    .orderBy(asc(siteSolutions.position), asc(siteSolutions.id));
}

export async function saveSolution(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const staff = await requirePermission("site:write");
  await ensureSeeded(staff.id);

  const originalSlug = formData.get("originalSlug");
  if (typeof originalSlug !== "string") return fail("Solution inconnue.");

  const content = SolutionContentSchema.safeParse(readJson(formData, "content"));
  const media = SolutionMediaSchema.safeParse(readJson(formData, "media"));
  if (!content.success || !media.success) {
    return {
      ok: false,
      message: "Certains champs sont invalides — voir en rouge.",
      fieldErrors: {
        ...(content.success ? {} : issuesToErrors(content.error, "content.")),
        ...(media.success ? {} : issuesToErrors(media.error, "media.")),
      },
    };
  }

  const [row] = await db.select().from(siteSolutions).where(eq(siteSolutions.slug, originalSlug)).limit(1);
  if (!row) return fail("Cette solution n'existe plus.");

  const slug = content.data.slug;
  if (slug !== originalSlug) {
    const [clash] = await db
      .select({ id: siteSolutions.id })
      .from(siteSolutions)
      .where(and(eq(siteSolutions.slug, slug), ne(siteSolutions.id, row.id)))
      .limit(1);
    if (clash) return { ok: false, message: "Cette adresse est déjà utilisée.", fieldErrors: { "content.slug": "Adresse déjà prise." } };
  }

  await db
    .update(siteSolutions)
    .set({
      slug,
      content: content.data,
      media: media.data,
      published: formData.get("published") === "on",
      updatedById: staff.id,
      updatedAt: new Date(),
    })
    .where(eq(siteSolutions.id, row.id));
  await logActivity({ actorId: staff.id, action: "site.solution_updated", entity: "site_solution", entityId: row.id, meta: { slug } });
  refreshSite(SITE_SOLUTIONS_TAG);

  // The editor's URL is the slug, so a rename has to move the page along with it.
  if (slug !== originalSlug) {
    await flash("Solution enregistrée.");
    redirect(`/admin/site/solutions/${slug}?saved=1`);
  }
  return succeed(SAVED);
}

export async function createSolution(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const staff = await requirePermission("site:write");
  const name = String(formData.get("name") ?? "").trim();
  if (name.length < 2) return { ok: false, message: "Donnez un nom.", fieldErrors: { name: "Au moins 2 caractères." } };

  const slug = SlugSchema.safeParse(
    String(formData.get("slug") ?? "").trim() ||
      name
        .normalize("NFKD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, ""),
  );
  if (!slug.success) return { ok: false, message: "Adresse invalide.", fieldErrors: { slug: slug.error.issues[0]?.message ?? "Invalide." } };

  await ensureSeeded(staff.id);
  const [clash] = await db.select({ id: siteSolutions.id }).from(siteSolutions).where(eq(siteSolutions.slug, slug.data)).limit(1);
  if (clash) return { ok: false, message: "Cette adresse est déjà utilisée.", fieldErrors: { slug: "Adresse déjà prise." } };

  const rows = await orderedRows();
  const blank = blankSolution(slug.data, name);
  const [created] = await db
    .insert(siteSolutions)
    .values({
      slug: slug.data,
      position: rows.length ? Math.max(...rows.map((r) => r.position)) + 1 : 0,
      // Hidden until the owner has filled it in and flips it on.
      published: false,
      content: blank.content,
      media: blank.media,
      updatedById: staff.id,
    })
    .returning({ id: siteSolutions.id });
  await logActivity({ actorId: staff.id, action: "site.solution_created", entity: "site_solution", entityId: created.id, meta: { slug: slug.data } });
  refreshSite(SITE_SOLUTIONS_TAG);
  await flash("Solution créée.");
  redirect(`/admin/site/solutions/${slug.data}`);
}

export async function deleteSolution(formData: FormData): Promise<void> {
  const staff = await requirePermission("site:write");
  const slug = String(formData.get("slug") ?? "");
  await ensureSeeded(staff.id);
  const [row] = await db.delete(siteSolutions).where(eq(siteSolutions.slug, slug)).returning({ id: siteSolutions.id });
  if (row) {
    await logActivity({ actorId: staff.id, action: "site.solution_deleted", entity: "site_solution", entityId: row.id, meta: { slug } });
  }
  refreshSite(SITE_SOLUTIONS_TAG);
  await flash("Solution supprimée.");
  redirect("/admin/site/solutions");
}

export async function moveSolution(formData: FormData): Promise<void> {
  const staff = await requirePermission("site:write");
  const slug = String(formData.get("slug") ?? "");
  const dir = formData.get("dir") === "up" ? -1 : 1;
  await ensureSeeded(staff.id);

  const rows = await orderedRows();
  const i = rows.findIndex((r) => r.slug === slug);
  const j = i + dir;
  if (i < 0 || j < 0 || j >= rows.length) return;

  // Renumber the whole list in its new order: positions may have gaps or ties.
  const order = [...rows];
  [order[i], order[j]] = [order[j], order[i]];
  await db.transaction(async (tx) => {
    for (const [position, r] of order.entries()) {
      await tx.update(siteSolutions).set({ position }).where(eq(siteSolutions.id, r.id));
    }
  });
  await logActivity({ actorId: staff.id, action: "site.solution_moved", entity: "site_solution", meta: { slug, dir } });
  refreshSite(SITE_SOLUTIONS_TAG);
  await flash("Ordre des solutions mis à jour.");
}

export async function toggleSolution(formData: FormData): Promise<void> {
  const staff = await requirePermission("site:write");
  const slug = String(formData.get("slug") ?? "");
  await ensureSeeded(staff.id);
  const [row] = await db
    .update(siteSolutions)
    .set({ published: sql`not ${siteSolutions.published}`, updatedAt: new Date(), updatedById: staff.id })
    .where(eq(siteSolutions.slug, slug))
    .returning({ id: siteSolutions.id, published: siteSolutions.published });
  if (row) {
    await logActivity({
      actorId: staff.id,
      action: row.published ? "site.solution_published" : "site.solution_hidden",
      entity: "site_solution",
      entityId: row.id,
      meta: { slug },
    });
  }
  refreshSite(SITE_SOLUTIONS_TAG);
  await flash("Visibilité mise à jour.");
}

/* ───────────────────────────── Blog ───────────────────────────── */

/**
 * Articles, same shape of write as the solutions above: validate, upsert, log, refresh.
 *
 * `updatedAt` is set by hand on every path. The column has a `defaultNow()` and **no**
 * `$onUpdate`, so an edit that did not write it would leave the creation date in
 * place — and that column is what the sitemap publishes as `lastModified`.
 */
export async function savePost(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const staff = await requirePermission("site:write");

  const originalSlug = formData.get("originalSlug");
  if (typeof originalSlug !== "string") return fail("Article inconnu.");

  const content = PostContentSchema.safeParse(readJson(formData, "content"));
  if (!content.success) {
    return {
      ok: false,
      message: "Certains champs sont invalides — voir en rouge.",
      fieldErrors: issuesToErrors(content.error, "content."),
    };
  }

  const slug = SlugSchema.safeParse(String(formData.get("slug") ?? "").trim());
  if (!slug.success) {
    return { ok: false, message: "Adresse invalide.", fieldErrors: { slug: slug.error.issues[0]?.message ?? "Invalide." } };
  }

  const [row] = await db.select().from(sitePosts).where(eq(sitePosts.slug, originalSlug)).limit(1);
  if (!row) return fail("Cet article n'existe plus.");

  if (slug.data !== originalSlug) {
    /* A published slug is the article's address everywhere it has been shared or
       indexed. Renaming it 404s the old URL and throws away whatever ranking it had,
       and a redirect table for a handful of articles would be more machinery than the
       problem deserves — so the rename is simply refused once it is public. */
    if (row.published) {
      return {
        ok: false,
        message: "L'adresse d'un article publié ne peut plus changer : l'ancien lien renverrait une erreur.",
        fieldErrors: { slug: "Masquez l'article d'abord si vous devez vraiment la changer." },
      };
    }
    const [clash] = await db
      .select({ id: sitePosts.id })
      .from(sitePosts)
      .where(and(eq(sitePosts.slug, slug.data), ne(sitePosts.id, row.id)))
      .limit(1);
    if (clash) return { ok: false, message: "Cette adresse est déjà utilisée.", fieldErrors: { slug: "Adresse déjà prise." } };
  }

  const published = formData.get("published") === "on";
  await db
    .update(sitePosts)
    .set({
      slug: slug.data,
      content: content.data,
      published,
      // Backdating stays possible (the field is editable), but publishing for the
      // first time has to stamp *something* or the article sorts last forever.
      publishedAt: published ? (row.publishedAt ?? new Date()) : row.publishedAt,
      updatedById: staff.id,
      updatedAt: new Date(),
    })
    .where(eq(sitePosts.id, row.id));
  await logActivity({ actorId: staff.id, action: "site.post_updated", entity: "site_post", entityId: row.id, meta: { slug: slug.data } });
  refreshSite(SITE_POSTS_TAG);

  if (slug.data !== originalSlug) redirect(`/admin/site/blog/${slug.data}?saved=1`);
  return succeed(SAVED);
}

export async function createPost(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const staff = await requirePermission("site:write");
  const title = String(formData.get("title") ?? "").trim();
  if (title.length < 2) return { ok: false, message: "Donnez un titre.", fieldErrors: { title: "Au moins 2 caractères." } };

  const slug = SlugSchema.safeParse(
    String(formData.get("slug") ?? "").trim() ||
      title
        .normalize("NFKD")
        .replace(/[̀-ͯ]/g, "")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .slice(0, 60)
        .replace(/-+$/, ""),
  );
  if (!slug.success) return { ok: false, message: "Adresse invalide.", fieldErrors: { slug: slug.error.issues[0]?.message ?? "Invalide." } };

  const [clash] = await db.select({ id: sitePosts.id }).from(sitePosts).where(eq(sitePosts.slug, slug.data)).limit(1);
  if (clash) return { ok: false, message: "Cette adresse est déjà utilisée.", fieldErrors: { slug: "Adresse déjà prise." } };

  const [created] = await db
    .insert(sitePosts)
    .values({
      slug: slug.data,
      // Created as a draft: a 404 until the owner has written it and flips it on.
      published: false,
      content: blankPost(title),
      authorId: staff.id,
      updatedById: staff.id,
    })
    .returning({ id: sitePosts.id });
  await logActivity({ actorId: staff.id, action: "site.post_created", entity: "site_post", entityId: created.id, meta: { slug: slug.data } });
  refreshSite(SITE_POSTS_TAG);
  redirect(`/admin/site/blog/${slug.data}`);
}

export async function deletePost(formData: FormData): Promise<void> {
  const staff = await requirePermission("site:write");
  const slug = String(formData.get("slug") ?? "");
  const [row] = await db.delete(sitePosts).where(eq(sitePosts.slug, slug)).returning({ id: sitePosts.id });
  if (row) {
    await logActivity({ actorId: staff.id, action: "site.post_deleted", entity: "site_post", entityId: row.id, meta: { slug } });
  }
  refreshSite(SITE_POSTS_TAG);
  redirect("/admin/site/blog");
}

export async function togglePost(formData: FormData): Promise<void> {
  const staff = await requirePermission("site:write");
  const slug = String(formData.get("slug") ?? "");
  const [row] = await db
    .update(sitePosts)
    .set({
      published: sql`not ${sitePosts.published}`,
      publishedAt: sql`coalesce(${sitePosts.publishedAt}, now())`,
      updatedAt: new Date(),
      updatedById: staff.id,
    })
    .where(eq(sitePosts.slug, slug))
    .returning({ id: sitePosts.id, published: sitePosts.published });
  if (row) {
    await logActivity({
      actorId: staff.id,
      action: row.published ? "site.post_published" : "site.post_hidden",
      entity: "site_post",
      entityId: row.id,
      meta: { slug },
    });
  }
  refreshSite(SITE_POSTS_TAG);
}
