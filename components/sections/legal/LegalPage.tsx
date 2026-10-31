import type { ReactNode } from "react";
import { Container } from "@/components/ui/Container";

/**
 * The shell the institutional pages share: one measure, one type ramp, one rhythm.
 *
 * They are text and nothing else, and the one thing that matters about them is that
 * they read as official — which a shared, boring layout does better than three
 * hand-built ones that drift apart.
 */
export function LegalPage({
  title,
  intro,
  updatedAt,
  children,
}: {
  title: string;
  intro: string;
  updatedAt?: string;
  children: ReactNode;
}) {
  return (
    <main id="contenu" className="flex flex-1 flex-col pb-24 pt-32">
      <Container className="flex max-w-[44rem] flex-col gap-10">
        <header className="flex flex-col gap-3">
          <h1 className="text-4xl font-semibold leading-[1.1] text-ink md:text-5xl">{title}</h1>
          <p className="text-lg text-ink/80">{intro}</p>
          {updatedAt && <p className="text-sm text-ink/80">Dernière mise à jour : {updatedAt}</p>}
        </header>
        {children}
      </Container>
    </main>
  );
}

export function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-xl font-semibold text-ink">{title}</h2>
      <div className="flex flex-col gap-3 text-base leading-relaxed text-ink/80">{children}</div>
    </section>
  );
}

/**
 * A label/value table. A row whose value is empty is **dropped**, not rendered blank:
 * these values come from an identity the owner fills in over time, and an empty "NIS :"
 * line reads as an omission rather than as a field that does not apply.
 */
export function Facts({ rows }: { rows: [string, string | undefined][] }) {
  const filled = rows.filter(([, value]) => value && value.trim());
  if (filled.length === 0) {
    return (
      <p className="rounded-2xl bg-mist px-5 py-4 text-sm">
        Ces informations seront publiées dès que l&apos;immatriculation de la société sera finalisée.
      </p>
    );
  }
  return (
    <dl className="flex flex-col divide-y divide-ink/10 rounded-2xl ring-1 ring-ink/10">
      {filled.map(([label, value]) => (
        <div key={label} className="flex flex-col gap-0.5 px-5 py-3 sm:flex-row sm:gap-6">
          <dt className="text-sm font-[650] text-ink sm:w-52 sm:shrink-0">{label}</dt>
          <dd className="text-sm text-ink/80">{value}</dd>
        </div>
      ))}
    </dl>
  );
}
