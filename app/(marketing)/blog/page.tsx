import type { Metadata } from "next";
import { getSiteContent } from "@/lib/content";
import { getPostPage } from "@/lib/content/posts";
import { resolveSeo } from "@/lib/seo/metadata";
import { BlogIndex } from "@/components/sections/blog/BlogIndex";

export const revalidate = 600;

export async function generateMetadata(): Promise<Metadata> {
  const { general } = await getSiteContent();
  const { title, description, canonical, robots } = resolveSeo({
    fallbackTitle: "Blog",
    fallbackDescription:
      "Articles, retours d'expérience et guides pratiques sur le cloud, l'OCR et le paiement, par les équipes WICLOUD.",
    path: "/blog",
    siteNoindex: general.noindex,
  });

  return {
    title,
    description,
    alternates: { canonical },
    ...(robots ? { robots } : {}),
    openGraph: { type: "website", url: canonical, title, description },
    twitter: { card: "summary_large_image", title, description },
  };
}

export default async function BlogPage() {
  const { posts, page, pageCount } = await getPostPage(1);
  return (
    <main id="contenu" className="flex flex-1 flex-col">
      <BlogIndex posts={posts} page={page} pageCount={pageCount} />
    </main>
  );
}
