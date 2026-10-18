import Link from "next/link";
import type { Post } from "@/lib/content/posts";
import { Container } from "@/components/ui/Container";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { Reveal } from "@/components/ui/Reveal";
import { PostCard } from "./PostCard";

/**
 * The article list, shared by `/blog` and `/blog/page/[n]`.
 *
 * Pagination is drawn as plain `<a>` links to real paths. Two deliberate choices:
 *  - **paths, not `?page=`** — a `searchParams` read would make the route dynamic,
 *    and these pages have no reason not to be static;
 *  - **no `rel="prev"`/`rel="next"`** — Google stopped using them years ago, and what
 *    it does follow is an ordinary link it can crawl.
 */
export function BlogIndex({
  posts,
  page,
  pageCount,
}: {
  posts: Post[];
  page: number;
  pageCount: number;
}) {
  return (
    <section className="py-24">
      <Container className="flex flex-col gap-14">
        <SectionHeading
          eyebrow="Ressources"
          title="Le blog WICLOUD."
          description="Ce que nous apprenons en déployant du cloud, de l'OCR et du paiement pour nos clients."
        />

        {posts.length === 0 ? (
          <p className="rounded-3xl bg-mist px-6 py-16 text-center text-sm text-ink/80">
            Les premiers articles arrivent bientôt.
          </p>
        ) : (
          <Reveal className="grid grid-cols-1 gap-10 sm:grid-cols-2 lg:grid-cols-3">
            {posts.map((post) => (
              <PostCard key={post.slug} post={post} />
            ))}
          </Reveal>
        )}

        {pageCount > 1 && (
          <nav aria-label="Pagination" className="flex items-center justify-center gap-2">
            {Array.from({ length: pageCount }, (_, i) => i + 1).map((n) => (
              <Link
                key={n}
                // Page 1 lives at /blog only, so there is one URL per page.
                href={n === 1 ? "/blog" : `/blog/page/${n}`}
                aria-current={n === page ? "page" : undefined}
                className={
                  n === page
                    ? "rounded-full bg-ink px-4 py-2 text-sm font-[650] text-paper"
                    : "rounded-full px-4 py-2 text-sm font-[650] text-ink ring-1 ring-ink/15 hover:bg-ink/5"
                }
              >
                {n}
              </Link>
            ))}
          </nav>
        )}
      </Container>
    </section>
  );
}
