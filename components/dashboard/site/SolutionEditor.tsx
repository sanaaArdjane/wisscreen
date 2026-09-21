"use client";

import { useActionState, useEffect, useState } from "react";
import { FormAlert, SubmitButton } from "@/components/dashboard/ui";
import { Icon } from "@/components/ui/Icon";
import { IDLE, type ActionState } from "@/lib/actions";
import type { SolutionContent, SolutionMediaContent } from "@/lib/content/schema";
import {
  SLOT_KIND_OPTIONS,
  SOLUTION_CONTENT_FORM,
  SOLUTION_IDENTITY_FORM,
  SOLUTION_LAYOUT_FORM,
  SOLUTION_MEDIA_FORM,
  type Option,
  type Where,
} from "@/lib/content/forms";
import { saveSolution } from "@/app/(app)/admin/site/actions";
import { cn } from "@/lib/cn";
import { SpecForm, SpecProvider } from "./SpecForm";
import { FieldHint } from "./FieldHint";
import { MediaField } from "./MediaField";

type Tab = "identite" | "contenu" | "medias" | "mise-en-page";
const TABS: [Tab, string][] = [
  ["identite", "Identité"],
  ["contenu", "Contenu"],
  ["medias", "Médias"],
  ["mise-en-page", "Mise en page"],
];

/** Which tab a server error path belongs to, so a failed save opens the right one. */
function tabOf(path: string): Tab {
  if (path.startsWith("media.") || path.startsWith("content.media")) return "medias";
  if (path === "content.highlightVariant") return "mise-en-page";
  const key = path.split(".")[1] ?? "";
  if (SOLUTION_CONTENT_FORM.some((f) => f.key === key)) return "contenu";
  return "identite";
}

const input =
  "w-full rounded-2xl bg-soft px-3 py-2.5 text-sm text-fg placeholder:text-fg/80 focus:outline-none focus:ring-2 focus:ring-fg";

/**
 * Edits one solution — the whole of its `lib/data/services.ts` entry (content) and its
 * `lib/data/media.ts` entry (media) — and posts both as JSON to `saveSolution`.
 */
export function SolutionEditor({
  initialContent,
  initialMedia,
  initialPublished,
  solutions,
  storage,
}: {
  initialContent: SolutionContent;
  initialMedia: SolutionMediaContent;
  initialPublished: boolean;
  solutions: Option[];
  storage: boolean;
}) {
  const [tab, setTab] = useState<Tab>("identite");
  const [content, setContent] = useState(initialContent);
  const [media, setMedia] = useState(initialMedia);
  const [published, setPublished] = useState(initialPublished);
  const snapshot = JSON.stringify([content, media, published]);
  const [saved, setSaved] = useState(() => JSON.stringify([initialContent, initialMedia, initialPublished]));
  const dirty = snapshot !== saved;

  const [state, action] = useActionState<ActionState, FormData>(async (prev, formData) => {
    const result = await saveSolution(prev, formData);
    if (result.ok) setSaved(String(formData.get("snapshot")));
    else {
      const first = Object.keys(result.fieldErrors ?? {})[0];
      if (first) setTab(tabOf(first));
    }
    return result;
  }, IDLE);

  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  // Errors come back as `content.x` / `media.x`; each SpecForm below renders one of
  // the two objects, so strip the prefix for it.
  const errors = state.fieldErrors ?? {};
  const scoped = (prefix: string) =>
    Object.fromEntries(Object.entries(errors).filter(([k]) => k.startsWith(prefix)).map(([k, v]) => [k.slice(prefix.length), v]));

  const setC = (next: Record<string, unknown>) => setContent(next as SolutionContent);
  const setM = (next: Record<string, unknown>) => setMedia(next as SolutionMediaContent);

  return (
    <form action={action} className="flex flex-col gap-6">
      <input type="hidden" name="originalSlug" value={initialContent.slug} />
      <input type="hidden" name="content" value={JSON.stringify(content)} />
      <input type="hidden" name="media" value={JSON.stringify(media)} />
      <input type="hidden" name="snapshot" value={snapshot} />
      {published && <input type="hidden" name="published" value="on" />}

      <div className="flex flex-wrap items-center justify-between gap-4 rounded-3xl bg-panel p-4 ring-1 ring-fg/10 sm:p-5">
        <label className="flex items-center gap-3 text-sm text-fg">
          <input
            type="checkbox"
            checked={published}
            onChange={(e) => setPublished(e.target.checked)}
            className="h-5 w-5 accent-[var(--dash-fg)]"
          />
          <span className="font-[650]">Publiée sur le site</span>
          <FieldHint
            where={{ page: "home", section: "Tout le site", detail: "Décochée : la solution disparaît partout et sa page renvoie une 404", anchor: "highlights" }}
          />
        </label>
        <div role="tablist" className="flex flex-wrap gap-1 rounded-full bg-soft p-1">
          {TABS.map(([id, label]) => {
            const count = Object.keys(errors).filter((k) => tabOf(k) === id).length;
            return (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={tab === id}
                onClick={() => setTab(id)}
                className={cn("rounded-full px-4 py-2 text-sm font-[650] transition-colors", tab === id ? "bg-fg text-on-fg" : "text-fg hover:bg-fg/8")}
              >
                {label}
                {count > 0 && ` (${count} ⚠)`}
              </button>
            );
          })}
        </div>
      </div>

      <div className="rounded-3xl bg-panel p-5 ring-1 ring-fg/10 sm:p-8">
        <SpecProvider errors={scoped("content.")} solutions={solutions} storage={storage} slug={content.slug}>
          {tab === "identite" && <SpecForm fields={SOLUTION_IDENTITY_FORM} value={content} onChange={setC} />}
          {tab === "contenu" && <SpecForm fields={SOLUTION_CONTENT_FORM} value={content} onChange={setC} />}
          {tab === "mise-en-page" && <SpecForm fields={SOLUTION_LAYOUT_FORM} value={content} onChange={setC} />}
        </SpecProvider>

        {tab === "medias" && (
          <div className="flex flex-col gap-8">
            <SpecProvider errors={scoped("media.")} solutions={solutions} storage={storage} slug={content.slug}>
              <SpecForm fields={SOLUTION_MEDIA_FORM} value={media} onChange={setM} />
            </SpecProvider>
            <PlaceholderSlot content={content} setContent={setContent} />
            <GalleryEditor content={content} media={media} setContent={setContent} setMedia={setMedia} storage={storage} slug={content.slug} />
            {content.highlightVariant === "cards-gif" && (
              <StatGifs content={content} media={media} setMedia={setMedia} storage={storage} slug={content.slug} />
            )}
          </div>
        )}
      </div>

      <div className="sticky bottom-0 z-10 -mx-2 flex flex-wrap items-center gap-3 rounded-2xl bg-panel/95 px-2 py-3 backdrop-blur">
        <SubmitButton isDisabled={!dirty}>Enregistrer et publier</SubmitButton>
        {dirty ? (
          <span className="text-sm font-[650] text-fg">● Modifications non enregistrées</span>
        ) : (
          <span className="text-sm text-fg/80">À jour</span>
        )}
        {initialPublished && (
          <a
            href={`/solutions/${initialContent.slug}`}
            target="_blank"
            rel="noopener noreferrer"
            className="ml-auto inline-flex items-center gap-1.5 text-sm font-[650] text-fg underline underline-offset-4"
          >
            Voir la page
            <Icon name="external" className="h-4 w-4" />
          </a>
        )}
      </div>
      <FormAlert state={state} />
    </form>
  );
}

/* ───────────────────────────── Media helpers ───────────────────────────── */

const galleryWhere = (detail: string): Where => ({
  page: "solution",
  section: "« Images, vidéos & démo »",
  anchor: "media",
  detail,
  size: "1600 × 1000 px (16:10)",
});

function Heading({ title, where, slug, children }: { title: string; where: Where; slug: string; children?: React.ReactNode }) {
  return (
    <header className="flex flex-col gap-1">
      <h3 className="flex flex-wrap items-center gap-2 text-base font-[650] text-fg">
        {title}
        <FieldHint where={where} slug={slug} />
      </h3>
      {children && <p className="text-sm text-fg/80">{children}</p>}
    </header>
  );
}

/** The generated art shown wherever the cover image is missing. */
function PlaceholderSlot({ content, setContent }: { content: SolutionContent; setContent: (c: SolutionContent) => void }) {
  const hero = content.media.hero;
  const set = (patch: Partial<typeof hero>) => setContent({ ...content, media: { ...content.media, hero: { ...hero, ...patch } } });
  return (
    <section className="flex flex-col gap-3 rounded-2xl p-4 ring-1 ring-fg/10">
      <Heading
        title="Visuel de remplacement de la couverture"
        slug={content.slug}
        where={{ page: "home", section: "« Toutes nos solutions », « La plateforme »", anchor: "solutions", detail: "Dessin généré tant qu'aucune image de couverture n'est définie" }}
      >
        Utilisé seulement si « Image de couverture » est vide.
      </Heading>
      <div className="grid gap-3 sm:grid-cols-2">
        <select value={hero.kind} onChange={(e) => set({ kind: e.target.value as typeof hero.kind })} className={input} aria-label="Style du visuel généré">
          {SLOT_KIND_OPTIONS.filter((o) => o.value.startsWith("mock")).map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <input value={hero.label} onChange={(e) => set({ label: e.target.value })} className={input} aria-label="Légende du visuel généré" placeholder="Légende" />
      </div>
    </section>
  );
}

/**
 * The solution page's gallery. A slot's *kind and label* live in the content, its
 * *file* in the media, matched by position — so both arrays are edited together here
 * and can never drift out of step.
 */
function GalleryEditor({
  content,
  media,
  setContent,
  setMedia,
  storage,
  slug,
}: {
  content: SolutionContent;
  media: SolutionMediaContent;
  setContent: (c: SolutionContent) => void;
  setMedia: (m: SolutionMediaContent) => void;
  storage: boolean;
  slug: string;
}) {
  const slots = content.media.gallery;
  const files = slots.map((_, i) => media.gallery[i] ?? "");
  const write = (nextSlots: typeof slots, nextFiles: string[]) => {
    setContent({ ...content, media: { ...content.media, gallery: nextSlots } });
    setMedia({ ...media, gallery: nextFiles });
  };
  const swap = (i: number, j: number) => {
    if (j < 0 || j >= slots.length) return;
    const s = [...slots];
    const f = [...files];
    [s[i], s[j]] = [s[j], s[i]];
    [f[i], f[j]] = [f[j], f[i]];
    write(s, f);
  };
  const btn = "flex h-8 w-8 items-center justify-center rounded-full text-fg hover:bg-fg/10 disabled:opacity-40";

  return (
    <section className="flex flex-col gap-4">
      <Heading title="Galerie de la page" slug={slug} where={galleryWhere("La grille d'images et de vidéos")}>
        La 1re image sert aussi à « OCR en action » sur l&apos;accueil si cette solution y est choisie.
      </Heading>
      <ol className="flex flex-col gap-3">
        {slots.map((slot, i) => (
          <li key={i} className="flex flex-col gap-3 rounded-2xl p-4 ring-1 ring-fg/10">
            <div className="flex items-center gap-2">
              <span className="text-sm font-[650] text-fg">Emplacement {i + 1}</span>
              <FieldHint where={galleryWhere(`Case n° ${i + 1} de la grille`)} slug={slug} />
              <span className="ml-auto flex">
                <button type="button" className={btn} disabled={i === 0} onClick={() => swap(i, i - 1)} aria-label="Monter">
                  <Icon name="chevron-down" className="h-4 w-4 rotate-180" />
                </button>
                <button type="button" className={btn} disabled={i === slots.length - 1} onClick={() => swap(i, i + 1)} aria-label="Descendre">
                  <Icon name="chevron-down" className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  className={btn}
                  onClick={() => write(slots.filter((_, j) => j !== i), files.filter((_, j) => j !== i))}
                  aria-label="Retirer cet emplacement"
                >
                  <Icon name="close" className="h-4 w-4" />
                </button>
              </span>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <select
                value={slot.kind}
                aria-label="Type d'emplacement"
                onChange={(e) => write(slots.map((s, j) => (j === i ? { ...s, kind: e.target.value as typeof s.kind } : s)), files)}
                className={input}
              >
                {SLOT_KIND_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
              <input
                value={slot.label}
                aria-label="Légende"
                placeholder="Légende"
                onChange={(e) => write(slots.map((s, j) => (j === i ? { ...s, label: e.target.value } : s)), files)}
                className={input}
              />
            </div>
            <MediaField
              value={files[i]}
              onChange={(v) => write(slots, files.map((f, j) => (j === i ? v : f)))}
              kind={slot.kind === "video-slot" ? "video" : "image"}
              storage={storage}
            />
          </li>
        ))}
      </ol>
      <button
        type="button"
        disabled={slots.length >= 12}
        onClick={() => write([...slots, { kind: "image-slot", label: "" }], [...files, ""])}
        className="flex w-fit items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-[650] text-fg ring-1 ring-fg/20 hover:bg-fg/8 disabled:opacity-40"
      >
        <Icon name="plus" className="h-4 w-4" />
        Ajouter un emplacement
      </button>
    </section>
  );
}

/** One looping GIF per stat tile — only read by the "Chiffres + GIF" card layout. */
function StatGifs({
  content,
  media,
  setMedia,
  storage,
  slug,
}: {
  content: SolutionContent;
  media: SolutionMediaContent;
  setMedia: (m: SolutionMediaContent) => void;
  storage: boolean;
  slug: string;
}) {
  const stats = content.stats.slice(0, 3);
  const where: Where = {
    page: "home",
    section: "« L'essentiel, en un coup d'œil »",
    anchor: "highlights",
    detail: "Animation qui remplit la carte au survol d'une tuile",
    size: "GIF court en boucle",
  };
  return (
    <section className="flex flex-col gap-4">
      <Heading title="Animations des tuiles de chiffres" slug={slug} where={where}>
        Une animation par chiffre clé (les 3 premiers), affichée au survol de la tuile.
      </Heading>
      {stats.map((stat, i) => (
        <div key={i} className="flex flex-col gap-2">
          <span className="text-sm font-[650] text-fg">
            {stat.value || `Chiffre ${i + 1}`} — {stat.label}
          </span>
          <MediaField
            value={media.statGifs[i] ?? ""}
            kind="image"
            storage={storage}
            onChange={(v) => {
              const next = [...media.statGifs];
              while (next.length <= i) next.push("");
              next[i] = v;
              setMedia({ ...media, statGifs: next });
            }}
          />
        </div>
      ))}
    </section>
  );
}
