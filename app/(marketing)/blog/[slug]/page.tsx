import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getSiteContent, getSolutions } from "@/lib/content";
import { getPost, getPosts } from "@/lib/content/posts";
import { Markdown } from "@/lib/markdown";
import { resolveSeo } from "@/lib/seo/metadata";
import { blogPostingSchema, breadcrumbTrail, faqSchema } from "@/lib/seo/schema";
import { JsonLd } from "@/components/seo/JsonLd";
import { Container } from "@/components/ui/Container";
import { Accordion } from "@/components/ui/Accordion";
import { Icon } from "@/components/ui/Icon";
import { PostCard, postDate, readingMinutes } from "@/components/sections/blog/PostCard";

type Params = { slug: string };

// An article published after the build is rendered on its first visit; a draft or an
// unknown slug is a 404, which is what keeps a draft genuinely private.
export const dynamicParams = true;
export const revalidate = 600;

export async function generateStaticParams(): Promise<Params[]> {
  return (await getPosts()).map((post) => ({ slug: post.slug }));
}

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPost(slug);
  if (!post) return {};

  const { general } = await getSiteContent();
  const { title, description, canonical, robots } = resolveSeo({
    seo: post.content.seo,
    fallbackTitle: post.content.title,
    fallbackDescription: post.content.excerpt,
    path: `/blog/${post.slug}`,
    siteNoindex: general.noindex,
  });

  return {
    title,
    description,
    ...(post.content.tags.length ? { keywords: post.content.tags } : {}),
    alternates: { canonical },
    ...(robots ? { robots } : {}),
    openGraph: {
      type: "article",
      url: canonical,
      title,
      description,
      ...(post.publishedAt ? { publishedTime: post.publishedAt.toISOString() } : {}),
      modifiedTime: post.updatedAt.toISOString(),
      ...(post.authorName ? { authors: [post.authorName] } : {}),
    },
    twitter: { card: "summary_large_image", title, description },
  };
}

export default async function PostPage({ params }: { params: Promise<Params> }) {
  const { slug } = await params;
  const post = await getPost(slug);
  if (!post) notFound();

  const { content } = post;
  const faq = faqSchema(content.faq);

  /* The internal mesh, both ways: the solutions this article argues for, and the
     other articles. `relatedSolutions` holds slugs, so a solution hidden or deleted
     in /admin/site simply drops out of the list rather than linking to a 404. */
  const solutions = (await getSolutions()).filter((service) =>
    content.relatedSolutions.includes(service.slug),
  );
  const more = (await getPosts()).filter((other) => other.slug !== post.slug).slice(0, 3);

  return (
    <main id="contenu" className="flex flex-1 flex-col">
      <JsonLd
        data={blogPostingSchema({
          slug: post.slug,
          title: content.title,
          excerpt: content.excerpt,
          cover: content.cover,
          publishedAt: post.publishedAt,
          updatedAt: post.updatedAt,
          authorName: post.authorName,
        })}
      />
      <JsonLd
        data={breadcrumbTrail([
          { name: "Accueil", path: "" },
          { name: "Blog", path: "/blog" },
          { name: content.title, path: `/blog/${post.slug}` },
        ])}
      />
      {faq && <JsonLd data={faq} />}

      <article className="pb-24 pt-32">
        <Container className="flex max-w-[48rem] flex-col gap-8">
          <nav aria-label="Fil d'Ariane" className="text-xs text-ink/80">
            <Link href="/blog" className="text-accent hover:underline">
              Blog
            </Link>
            <span aria-hidden="true"> / </span>
            {content.category || "Article"}
          </nav>

          <header className="flex flex-col gap-4">
            <h1 className="text-4xl font-semibold leading-[1.1] text-ink md:text-5xl">
              {content.title}
            </h1>
            <p className="text-lg text-ink/80">{content.excerpt}</p>
            <p className="text-sm text-ink/80">
              {post.authorName ? `${post.authorName} · ` : ""}
              {postDate(post)} · {readingMinutes(content.body)} min de lecture
            </p>
          </header>

          {content.cover && (
            <Image
              src={content.cover}
              alt={content.coverAlt || ""}
              width={1600}
              height={900}
              // The LCP element on this page, so it is eager and sized.
              priority
              sizes="(min-width: 768px) 768px, 100vw"
              className="w-full rounded-3xl object-cover"
            />
          )}

          {/* `headingOffset={1}`: the body's `#` is an `<h2>` under this page's own
              `<h1>`, which is what keeps the outline continuous. */}
          {/* `markdown-article` is what makes the dashboard-flavoured renderer readable
              on a marketing page: it declares the tokens it paints with and resets its
              type scale. See the note in globals.css. */}
          <div className="markdown-article flex flex-col gap-5 text-ink/80">
            <Markdown source={content.body} headingOffset={1} />
          </div>

          {content.tags.length > 0 && (
            <ul className="flex flex-wrap gap-2 pt-4">
              {content.tags.map((tag) => (
                <li
                  key={tag}
                  className="rounded-full border border-ink/15 px-3 py-1 text-xs text-ink"
                >
                  {tag}
                </li>
              ))}
            </ul>
          )}
        </Container>
      </article>

      {content.faq.length > 0 && (
        <section className="section-ink py-24">
          <Container className="flex max-w-[48rem] flex-col gap-8">
            <h2 className="text-3xl font-semibold text-paper">Questions fréquentes</h2>
            <Accordion
              items={content.faq.map((item) => ({ title: item.question, content: item.answer }))}
            />
          </Container>
        </section>
      )}

      {solutions.length > 0 && (
        <section className="py-24">
          <Container className="flex max-w-[48rem] flex-col gap-6">
            <h2 className="text-2xl font-semibold text-ink">La solution dont parle cet article</h2>
            <ul className="flex flex-col gap-3">
              {solutions.map((service) => (
                <li key={service.slug}>
                  <Link
                    href={`/solutions/${service.slug}`}
                    className="group flex items-center justify-between gap-4 rounded-2xl border border-ink/10 px-5 py-4 hover:bg-ink/5"
                  >
                    <span className="flex flex-col">
                      <span className="font-[650] text-ink">{service.name}</span>
                      <span className="text-sm text-ink/80">{service.tagline}</span>
                    </span>
                    <Icon
                      name="arrow-right"
                      className="h-5 w-5 shrink-0 text-accent transition-transform group-hover:translate-x-1"
                    />
                  </Link>
                </li>
              ))}
            </ul>
          </Container>
        </section>
      )}

      {more.length > 0 && (
        <section className="bg-mist py-24">
          <Container className="flex flex-col gap-10">
            <h2 className="text-2xl font-semibold text-ink">À lire aussi</h2>
            <div className="grid grid-cols-1 gap-10 sm:grid-cols-2 lg:grid-cols-3">
              {more.map((other) => (
                <PostCard key={other.slug} post={other} />
              ))}
            </div>
          </Container>
        </section>
      )}
    </main>
  );
}
