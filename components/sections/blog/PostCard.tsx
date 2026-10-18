import Image from "next/image";
import Link from "next/link";
import type { Post } from "@/lib/content/posts";
import { Icon } from "@/components/ui/Icon";

/** The date a reader sees, and the one in `datePublished`. */
export function postDate(post: Post): string {
  const date = post.publishedAt ?? post.updatedAt;
  return new Intl.DateTimeFormat("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
    // The server may be in UTC; the desk is not. Same reasoning as `Thread`.
    timeZone: "Africa/Algiers",
  }).format(date);
}

/** How long the article takes to read, from the body. ~200 words a minute. */
export function readingMinutes(body: string): number {
  return Math.max(1, Math.round(body.trim().split(/\s+/).length / 200));
}

/** One article in a list. */
export function PostCard({ post }: { post: Post }) {
  const { content } = post;

  return (
    <Link
      href={`/blog/${post.slug}`}
      data-reveal-item
      className="group flex flex-col gap-4"
    >
      <div className="relative aspect-[16/10] overflow-hidden rounded-2xl bg-mist">
        {content.cover ? (
          <Image
            src={content.cover}
            alt={content.coverAlt || ""}
            fill
            sizes="(min-width: 1024px) 400px, (min-width: 640px) 50vw, 100vw"
            className="object-cover transition-transform duration-500 group-hover:scale-[1.02]"
          />
        ) : (
          /* No cover is a normal state, not an error: an article is worth publishing
             without one, and a broken frame would say otherwise. */
          <div className="absolute inset-0 bg-gradient-to-br from-mist to-steel-pale/40" />
        )}
      </div>

      <div className="flex flex-col gap-2">
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-signal-deep">
          {content.category || "Article"}
        </p>
        <h2 className="text-xl font-semibold leading-snug text-ink">{content.title}</h2>
        <p className="line-clamp-3 text-sm text-ink/80">{content.excerpt}</p>
        <p className="text-xs text-ink/80">
          {postDate(post)} · {readingMinutes(content.body)} min de lecture
        </p>
        <span className="mt-1 inline-flex items-center gap-2 text-sm font-medium text-accent">
          Lire l&apos;article
          <Icon name="arrow-right" className="h-4 w-4 transition-transform group-hover:translate-x-1" />
        </span>
      </div>
    </Link>
  );
}
