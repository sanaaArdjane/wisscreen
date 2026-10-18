"use client";

import { useActionState, useEffect, useState } from "react";
import { Field, FormAlert, SubmitButton } from "@/components/dashboard/ui";
import { Icon } from "@/components/ui/Icon";
import { IDLE, type ActionState } from "@/lib/actions";
import type { PostContent } from "@/lib/content/schema";
import { POST_FORM, type Option } from "@/lib/content/forms";
import { createPost, savePost } from "@/app/(app)/admin/site/actions";
import { SpecForm, SpecProvider } from "./SpecForm";
import { FieldHint } from "./FieldHint";

/**
 * Edits one article. Same contract as `SolutionEditor`: one piece of state is the
 * source of truth and is posted as a single JSON field, so a new field in
 * `PostContentSchema` needs nothing here beyond its entry in `POST_FORM`.
 *
 * The slug is a real input rather than part of the spec, because it is a *column* and
 * not part of the jsonb — and because the server refuses to change it once the article
 * is published (the old URL would 404), which the field says in so many words.
 */
export function PostEditor({
  slug,
  initialContent,
  initialPublished,
  solutions,
  storage,
}: {
  slug: string;
  initialContent: PostContent;
  initialPublished: boolean;
  solutions: Option[];
  storage: boolean;
}) {
  const [content, setContent] = useState(initialContent);
  const [published, setPublished] = useState(initialPublished);
  const [address, setAddress] = useState(slug);
  const snapshot = JSON.stringify([content, published, address]);
  const [saved, setSaved] = useState(() => JSON.stringify([initialContent, initialPublished, slug]));
  const dirty = snapshot !== saved;

  const [state, action] = useActionState<ActionState, FormData>(async (prev, formData) => {
    const result = await savePost(prev, formData);
    if (result.ok) setSaved(String(formData.get("snapshot")));
    return result;
  }, IDLE);

  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  const errors = state.fieldErrors ?? {};
  const scoped = Object.fromEntries(
    Object.entries(errors)
      .filter(([k]) => k.startsWith("content."))
      .map(([k, v]) => [k.slice("content.".length), v]),
  );

  return (
    <form action={action} className="flex flex-col gap-6">
      <input type="hidden" name="originalSlug" value={slug} />
      <input type="hidden" name="content" value={JSON.stringify(content)} />
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
          <span className="font-[650]">Publié sur le site</span>
          <FieldHint
            where={{
              page: "blog",
              section: "Blog",
              detail: "Décoché : l'article disparaît de /blog et son adresse renvoie une 404",
            }}
          />
        </label>
        {initialPublished && (
          <a
            href={`/blog/${slug}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-sm font-[650] text-fg underline underline-offset-4"
          >
            Voir l&apos;article
            <Icon name="external" className="h-4 w-4" />
          </a>
        )}
      </div>

      <div className="flex flex-col gap-8 rounded-3xl bg-panel p-5 ring-1 ring-fg/10 sm:p-8">
        {/* A plain input, not the `Field` component: this one has to be controlled
            (it takes part in the unsaved-changes check) and, once published, it has to
            still *post* its value while refusing edits — a disabled field posts
            nothing, which would fail validation on save. */}
        <div className="flex flex-col gap-1.5">
          <label htmlFor="post-slug" className="flex flex-wrap items-center gap-2 text-sm font-[650] text-fg">
            Adresse de l&apos;article
            <FieldHint where={{ page: "blog", section: "Adresse de la page", detail: "/blog/<adresse>" }} />
          </label>
          <input
            id="post-slug"
            name="slug"
            value={address}
            readOnly={initialPublished}
            onChange={(e) => setAddress(e.target.value)}
            className="w-full rounded-2xl bg-soft px-3 py-2.5 font-mono text-sm text-fg read-only:opacity-70 focus:outline-none focus:ring-2 focus:ring-fg"
          />
          <p className="text-sm text-fg/80">
            {initialPublished
              ? "Figée : la changer renverrait une erreur à tous les liens déjà partagés. Masquez l'article d'abord si c'est indispensable."
              : `L'article sera à /blog/${address || "…"}. Après publication, elle ne pourra plus changer.`}
          </p>
          {errors.slug && <p className="text-sm font-[650] text-fg">{errors.slug}</p>}
        </div>

        <SpecProvider errors={scoped} solutions={solutions} storage={storage} slug={slug}>
          <SpecForm
            fields={POST_FORM}
            value={content as unknown as Record<string, unknown>}
            onChange={(next) => setContent(next as unknown as PostContent)}
          />
        </SpecProvider>
      </div>

      <div className="sticky bottom-0 z-10 -mx-2 flex flex-wrap items-center gap-3 rounded-2xl bg-panel/95 px-2 py-3 backdrop-blur">
        <SubmitButton isDisabled={!dirty}>Enregistrer</SubmitButton>
        {dirty ? (
          <span className="text-sm font-[650] text-fg">● Modifications non enregistrées</span>
        ) : (
          <span className="text-sm text-fg/80">À jour</span>
        )}
      </div>
      <FormAlert state={state} />
    </form>
  );
}

/** "Écrire un article": a title (and optionally the address), then into its editor. */
export function NewPostForm() {
  const [state, action] = useActionState<ActionState, FormData>(
    createPost,
    IDLE,
  );
  return (
    <form action={action} className="flex flex-col gap-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          name="title"
          label="Titre de l'article"
          isRequired
          placeholder="Ex. Migrer un serveur physique vers le cloud"
          error={state.fieldErrors?.title}
        />
        <Field
          name="slug"
          label="Adresse (facultatif)"
          placeholder="migrer-serveur-vers-cloud"
          description="Devient /blog/<adresse>. Déduite du titre si vide, et figée dès la publication."
          error={state.fieldErrors?.slug}
        />
      </div>
      <FormAlert state={state} />
      <div>
        <SubmitButton>Créer et écrire</SubmitButton>
      </div>
    </form>
  );
}
