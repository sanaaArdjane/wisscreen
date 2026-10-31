import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { getSiteContent } from "@/lib/content";
import { getPostPage, getPosts, POSTS_PER_PAGE } from "@/lib/content/posts";
import { resolveSeo } from "@/lib/seo/metadata";
import { BlogIndex } from "@/components/sections/blog/BlogIndex";

/**
 * Pages 2..N of the blog.
 *
 * A path rather than `/blog?page=2`, because reading `searchParams` would make the
 * route dynamic and there is no reason for these to be.
 */
export const revalidate = 600;
export const dynamicParams = true;

type Params = { n: string };

export async function generateStaticParams(): Promise<Params[]> {
  const count = Math.ceil((await getPosts()).length / POSTS_PER_PAGE);
  // Page 1 is `/blog`; this route starts at 2.
  return Array.from({ length: Math.max(0, count - 1) }, (_, i) => ({ n: String(i + 2) }));
}

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { n } = await params;
  const { general } = await getSiteContent();

  /*
   * **Each page is canonical to itself.** Pointing page 2+ at `/blog` is the classic
   * mistake: Google then treats them as duplicates of page 1 and every article old
   * enough to have fallen off it quietly leaves the index.
   */
  const { title, description, canonical, robots } = resolveSeo({
    fallbackTitle: `Blog — page ${n}`,
    fallbackDescription:
      "Articles, retours d'expérience et guides pratiques sur le cloud, l'OCR et le paiement, par les équipes SETYCORP.",
    path: `/blog/page/${n}`,
    siteNoindex: general.noindex,
  });

  return {
    title,
    description,
    alternates: { canonical },
    ...(robots ? { robots } : {}),
  };
}

export default async function BlogPaginatedPage({ params }: { params: Promise<Params> }) {
  const { n } = await params;
  const asked = Number(n);
  if (!Number.isInteger(asked) || asked < 1) notFound();
  // One URL per page: /blog/page/1 is the same list as /blog.
  if (asked === 1) redirect("/blog");

  const { posts, page, pageCount } = await getPostPage(asked);
  // Asking for a page past the end is a 404, not a silent clamp to the last one —
  // a clamp would serve the same list under endless distinct URLs.
  if (asked > pageCount) notFound();

  return (
    <main id="contenu" className="flex flex-1 flex-col">
      <BlogIndex posts={posts} page={page} pageCount={pageCount} />
    </main>
  );
}
