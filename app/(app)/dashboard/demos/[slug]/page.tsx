import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/guard";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { DemoBlocks } from "@/components/dashboard/demos/DemoBlocks";
import { getEntitledDemo, listDemoFiles, listRunsForUser } from "@/lib/server/demos";
import { MAX_UPLOAD_BYTES, storageConfigured } from "@/lib/storage";
import { getSolutions } from "@/lib/content";
import { formatDate } from "@/lib/format";
import { pillSmall } from "@/components/dashboard/pills";

export const metadata: Metadata = { title: "Démo" };

export default async function DemoPage({ params }: PageProps<"/dashboard/demos/[slug]">) {
  const { slug } = await params;
  const user = await requireUser(`/dashboard/demos/${slug}`);

  // Not entitled answers 404, not "accès refusé": that a demo by this name
  // exists for somebody else is itself the thing not to say.
  const entitled = await getEntitledDemo(user.id, { slug });
  if (!entitled) notFound();
  const { demo, blocks, expiresAt } = entitled;

  const [files, runs] = await Promise.all([listDemoFiles(demo.id), listRunsForUser(user.id, demo.id)]);
  const service = (await getSolutions({ includeHidden: true })).find((s) => s.slug === demo.serviceSlug);

  return (
    <>
      <PageHeader
        title={demo.title}
        description={demo.summary ?? undefined}
        backHref="/dashboard/demos"
        backLabel="Mes démos"
        actions={
          service && (
            <Link href={`/solutions/${service.slug}`} className={pillSmall}>
              Découvrir {service.name}
            </Link>
          )
        }
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          {blocks.length === 0 ? (
            <p className="rounded-3xl bg-soft px-6 py-10 text-center text-sm text-fg/80">
              Cette démo est en cours de préparation.
            </p>
          ) : (
            <DemoBlocks
              demoId={demo.id}
              blocks={blocks}
              files={files}
              runs={runs}
              demoExpiresAt={expiresAt}
              now={new Date()}
              storage={storageConfigured()}
              maxUploadBytes={MAX_UPLOAD_BYTES}
            />
          )}
        </div>
        <aside className="flex flex-col gap-4">
          <div className="rounded-3xl border border-fg/10 bg-panel p-5 text-sm">
            <p className="font-[650] text-fg">À propos de cet accès</p>
            <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5">
              {demo.category && (
                <>
                  <dt className="text-fg/80">Type</dt>
                  <dd className="text-fg">{demo.category}</dd>
                </>
              )}
              <dt className="text-fg/80">Disponible</dt>
              <dd className="text-fg">{expiresAt ? `jusqu'au ${formatDate(expiresAt)}` : "sans limite"}</dd>
            </dl>
            <p className="mt-4 text-xs text-fg/80">
              Les identifiants s&apos;affichent au clic et chaque affichage est enregistré. Ne les
              partagez pas en dehors de votre équipe.
            </p>
          </div>
          <Link
            href={`/dashboard/demandes/nouvelle?type=support&title=${encodeURIComponent(`Démo : ${demo.title}`)}`}
            className="rounded-3xl border border-fg/10 bg-panel p-5 text-sm transition-colors hover:border-fg/25"
          >
            <span className="block font-[650] text-fg">Une question sur cette démo ?</span>
            <span className="mt-1 block text-fg/80">Écrivez-nous, nous répondons dans la journée.</span>
          </Link>
        </aside>
      </div>
    </>
  );
}
