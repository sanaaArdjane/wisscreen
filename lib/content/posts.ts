import { desc, eq } from "drizzle-orm";
import { unstable_cache } from "next/cache";
import { db } from "@/lib/db";
import { sitePosts, user } from "@/lib/db/schema";
import { PostContentSchema, type PostContent } from "./schema";

/**
 * Reads of the blog. Server only (it imports the pool).
 *
 * Mirrors `lib/content/index.ts` deliberately, down to the shape of the cache: the
 * **raw rows** are cached under one tag, and the Zod parse runs on every read. Caching
 * the parsed result instead means a deploy that adds a field to `PostContentSchema`
 * serves `undefined` for it until the entry expires — the bug that file documents
 * having shipped once.
 *
 * Where it differs: there are no code defaults for articles. No database means no
 * blog, and that is a correct answer — the index renders its empty state and
 * `generateStaticParams` returns nothing. A solution has a default because the site
 * must describe what it sells even with the database down; an article that was never
 * written has nothing to fall back to.
 */

export const SITE_POSTS_TAG = "site-posts";

/** Articles per page on `/blog`. */
export const POSTS_PER_PAGE = 9;

export type Post = {
  id: number;
  slug: string;
  published: boolean;
  publishedAt: Date | null;
  updatedAt: Date;
  authorName: string | null;
  content: PostContent;
};

type Row = {
  id: number;
  slug: string;
  published: boolean;
  publishedAt: Date | null;
  updatedAt: Date;
  authorName: string | null;
  content: unknown;
};

/** Throws on a database error; the callers below turn that into an empty blog. */
async function loadPostRows(): Promise<Row[]> {
  return db
    .select({
      id: sitePosts.id,
      slug: sitePosts.slug,
      published: sitePosts.published,
      publishedAt: sitePosts.publishedAt,
      updatedAt: sitePosts.updatedAt,
      authorName: user.name,
      content: sitePosts.content,
    })
    .from(sitePosts)
    .leftJoin(user, eq(user.id, sitePosts.authorId))
    .orderBy(desc(sitePosts.publishedAt), desc(sitePosts.createdAt));
}

/** An article whose stored payload no longer parses is skipped, not fatal. */
function toPost(row: Row): Post | null {
  const content = PostContentSchema.safeParse(row.content);
  if (!content.success) {
    console.warn(`[site-posts] article « ${row.slug} » invalide, ignoré`);
    return null;
  }
  return {
    id: row.id,
    slug: row.slug,
    published: row.published,
    publishedAt: row.publishedAt,
    updatedAt: row.updatedAt,
    authorName: row.authorName,
    content: content.data,
  };
}

const cachedPostRows = unstable_cache(loadPostRows, ["site-posts"], {
  tags: [SITE_POSTS_TAG],
  revalidate: 3600,
});

/** Every article, drafts included. Admin only — uncached, so a save shows at once. */
export async function readPostRows(): Promise<Post[]> {
  try {
    return (await loadPostRows()).map(toPost).filter((p): p is Post => p !== null);
  } catch {
    return [];
  }
}

/** The published articles, newest first. */
export async function getPosts(): Promise<Post[]> {
  try {
    return (await cachedPostRows())
      .map(toPost)
      .filter((post): post is Post => post !== null && post.published);
  } catch {
    return [];
  }
}

export async function getPost(slug: string): Promise<Post | undefined> {
  return (await getPosts()).find((post) => post.slug === slug);
}

/**
 * One page of articles.
 *
 * Sliced in memory rather than with `LIMIT`/`OFFSET`, and that is a cache decision
 * rather than a lazy one: the cache holds **one** row list under **one** tag, so a
 * query per page would need a cache key per page and would invalidate wrongly when an
 * article is published. The whole list is a few KB of JSON.
 *
 * ponytail: whole list in memory + slice; move to SQL LIMIT/OFFSET past ~500 posts.
 */
export async function getPostPage(page: number): Promise<{
  posts: Post[];
  page: number;
  pageCount: number;
}> {
  const all = await getPosts();
  const pageCount = Math.max(1, Math.ceil(all.length / POSTS_PER_PAGE));
  const current = Math.min(Math.max(1, page), pageCount);
  return {
    posts: all.slice((current - 1) * POSTS_PER_PAGE, current * POSTS_PER_PAGE),
    page: current,
    pageCount,
  };
}

/** The articles that argue for a given solution — the other half of `relatedSolutions`. */
export async function getPostsForSolution(slug: string, limit = 3): Promise<Post[]> {
  return (await getPosts())
    .filter((post) => post.content.relatedSolutions.includes(slug))
    .slice(0, limit);
}
