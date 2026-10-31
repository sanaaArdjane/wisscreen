import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getSiteContent, getSolution, getSolutions } from "@/lib/content";
import { publishableUseCases } from "@/lib/content/usecases";
import { getPostsForSolution } from "@/lib/content/posts";
import { resolveSeo } from "@/lib/seo/metadata";
import { breadcrumbTrail, faqSchema } from "@/lib/seo/schema";
import { JsonLd } from "@/components/seo/JsonLd";
import { Container } from "@/components/ui/Container";
import { Accordion } from "@/components/ui/Accordion";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { PostCard } from "@/components/sections/blog/PostCard";

type Params = { slug: string; usecase: string };

export const dynamicParams = true;
export const revalidate = 600;

/** Only the use cases that pass `isUseCasePublishable` exist as URLs — see that file. */
async function find(slug: string, usecase: string) {
  const service = await getSolution(slug);
  if (!service) return null;
  const useCase = publishableUseCases(service.useCases ?? []).find((u) => u.slug === usecase);
  return useCase ? { service, useCase } : null;
}

export async function generateStaticParams(): Promise<Params[]> {
  const solutions = await getSolutions();
  return solutions.flatMap((service) =>
    publishableUseCases(service.useCases ?? []).map((useCase) => ({
      slug: service.slug,
      usecase: useCase.slug,
    })),
  );
}

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { slug, usecase } = await params;
  const found = await find(slug, usecase);
  if (!found) return {};
  const { service, useCase } = found;

  const { general } = await getSiteContent();
  const { title, description, canonical, robots } = resolveSeo({
    seo: useCase.seo,
    fallbackTitle: `${useCase.title} — ${service.name}`,
    // The intro's first sentence, not its first 160 characters: a description cut
    // mid-word is what Google rewrites rather than shows.
    fallbackDescription: useCase.intro.split(/(?<=[.!?])\s/)[0] ?? useCase.intro,
    path: `/solutions/${service.slug}/${useCase.slug}`,
    siteNoindex: general.noindex,
  });

  return {
    title,
    description,
    alternates: { canonical },
    ...(robots ? { robots } : {}),
    openGraph: { type: "article", url: canonical, title, description },
    twitter: { card: "summary_large_image", title, description },
  };
}

export default async function UseCasePage({ params }: { params: Promise<Params> }) {
  const { slug, usecase } = await params;
  const found = await find(slug, usecase);
  if (!found) notFound();
  const { service, useCase } = found;

  const faq = faqSchema(useCase.faq);
  const posts = await getPostsForSolution(service.slug);
  const siblings = publishableUseCases(service.useCases ?? []).filter((u) => u.slug !== useCase.slug);

  return (
    <main id="contenu" className="flex flex-1 flex-col">
      <JsonLd
        data={breadcrumbTrail([
          { name: "Accueil", path: "" },
          { name: "Solutions", path: "/#solutions" },
          { name: service.name, path: `/solutions/${service.slug}` },
          { name: useCase.title, path: `/solutions/${service.slug}/${useCase.slug}` },
        ])}
      />
      {faq && <JsonLd data={faq} />}

      <section className="section-ink pb-20 pt-32">
        <Container className="flex max-w-[52rem] flex-col gap-6">
          <nav aria-label="Fil d'Ariane" className="text-xs text-paper/80">
            <Link href={`/solutions/${service.slug}`} className="text-accent hover:underline">
              {service.name}
            </Link>
            <span aria-hidden="true"> / </span>
            Cas d&apos;usage
          </nav>
          <h1 className="text-4xl font-semibold leading-[1.1] text-paper md:text-5xl">
            {useCase.title}
          </h1>
          <p className="whitespace-pre-line text-lg leading-relaxed text-paper/80">{useCase.intro}</p>
          <div className="flex flex-wrap gap-3 pt-2">
            <Button href="/#contact">Parler à un expert</Button>
            <Button href={`/solutions/${service.slug}`} variant="ghost">
              Découvrir {service.name}
            </Button>
          </div>
        </Container>
      </section>

      <section className="py-24">
        <Container className="grid max-w-[64rem] grid-cols-1 gap-12 md:grid-cols-2">
          <div className="flex flex-col gap-5">
            <h2 className="text-2xl font-semibold text-ink">Ce qui bloque aujourd&apos;hui</h2>
            <ul className="flex flex-col gap-3">
              {useCase.problems.filter(Boolean).map((problem, i) => (
                <li key={i} className="flex gap-3 text-base text-ink/80">
                  <Icon name="close" className="mt-1 h-4 w-4 shrink-0 text-steel" />
                  {problem}
                </li>
              ))}
            </ul>
          </div>
          <div className="flex flex-col gap-5">
            <h2 className="text-2xl font-semibold text-ink">Ce que {service.name} change</h2>
            <ul className="flex flex-col gap-3">
              {useCase.benefits.filter(Boolean).map((benefit, i) => (
                <li key={i} className="flex gap-3 text-base text-ink/80">
                  <Icon name="check" className="mt-1 h-4 w-4 shrink-0 text-accent" />
                  {benefit}
                </li>
              ))}
            </ul>
          </div>
        </Container>
      </section>

      <section className="bg-mist py-24">
        <Container className="flex max-w-[52rem] flex-col gap-4">
          <h2 className="text-2xl font-semibold text-ink">Concrètement</h2>
          <p className="whitespace-pre-line text-base leading-relaxed text-ink/80">{useCase.proof}</p>
        </Container>
      </section>

      {useCase.faq.length > 0 && (
        <section className="py-24">
          <Container className="flex max-w-[52rem] flex-col gap-8">
            <h2 className="text-3xl font-semibold text-ink">Questions fréquentes</h2>
            <Accordion
              items={useCase.faq.map((item) => ({ title: item.question, content: item.answer }))}
            />
          </Container>
        </section>
      )}

      {(siblings.length > 0 || posts.length > 0) && (
        <section className="section-ink py-24">
          <Container className="flex flex-col gap-10">
            {siblings.length > 0 && (
              <div className="flex flex-col gap-4">
                <h2 className="text-2xl font-semibold text-paper">
                  Autres cas d&apos;usage de {service.name}
                </h2>
                <ul className="flex flex-wrap gap-3">
                  {siblings.map((other) => (
                    <li key={other.slug}>
                      <Link
                        href={`/solutions/${service.slug}/${other.slug}`}
                        className="inline-flex rounded-full px-4 py-2 text-sm font-medium text-paper ring-1 ring-white/20 hover:bg-white/10"
                      >
                        {other.title}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {posts.length > 0 && (
              <div className="flex flex-col gap-6">
                <h2 className="text-2xl font-semibold text-paper">À lire sur le sujet</h2>
                <div className="grid grid-cols-1 gap-10 sm:grid-cols-2 lg:grid-cols-3">
                  {posts.map((post) => (
                    <PostCard key={post.slug} post={post} />
                  ))}
                </div>
              </div>
            )}
          </Container>
        </section>
      )}
    </main>
  );
}
