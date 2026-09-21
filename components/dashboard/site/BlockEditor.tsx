"use client";

import { useActionState, useEffect, useState } from "react";
import { FormAlert, SubmitButton, ConfirmButton } from "@/components/dashboard/ui";
import { Icon } from "@/components/ui/Icon";
import { IDLE, type ActionState } from "@/lib/actions";
import type { BlockKey } from "@/lib/content/schema";
import { BLOCK_FORMS, HERO_TEXT_FORM, HERO_VISUAL_FORM, type Field, type Option } from "@/lib/content/forms";
import { saveBlock, resetBlock } from "@/app/(app)/admin/site/actions";
import { SpecForm, SpecProvider } from "./SpecForm";

type Obj = Record<string, unknown>;
type Panel = { title: string; description?: string; fields: Field[]; at?: string };

/**
 * The panels each block's editor is made of. Resolved here, on the client, from the
 * block key: the specs carry functions (`showIf`), which cannot be passed as props
 * from a server component.
 */
function panelsFor(key: BlockKey): Panel[] {
  if (key === "hero") {
    return [
      {
        title: "Visuel",
        description: "Ce qui occupe les 70 % de droite du haut de la page d'accueil (au-dessus du texte sur mobile).",
        fields: HERO_VISUAL_FORM,
        at: "visual",
      },
      { title: "Texte", description: "Les 30 % de gauche.", fields: HERO_TEXT_FORM },
    ];
  }
  return [{ title: "", fields: BLOCK_FORMS[key] ?? [] }];
}

/**
 * Edits one `site_content` block: local draft state → one JSON hidden input →
 * `saveBlock`, which validates against the block's Zod schema and publishes.
 *
 * - "Modifications non enregistrées" and a leave-page warning while the draft differs
 *   from what was last saved.
 * - "Revenir au texte d'origine" drops the stored block (the site falls back to the
 *   copy shipped in code) — confirm-gated, since it discards the owner's edits.
 */
export function BlockEditor({
  blockKey,
  initial,
  stored,
  solutions,
  storage,
  viewHref,
  compact,
}: {
  blockKey: BlockKey;
  initial: Obj;
  /** Whether a row exists — the reset control is pointless otherwise. */
  stored: boolean;
  solutions: Option[];
  storage: boolean;
  /** "Voir sur le site" target. */
  viewHref: string;
  /** Inside a list of sections: no outer card, smaller footer. */
  compact?: boolean;
}) {
  const [draft, setDraft] = useState<Obj>(initial);
  const [saved, setSaved] = useState(() => JSON.stringify(initial));
  const serialized = JSON.stringify(draft);
  const dirty = serialized !== saved;

  const [state, action] = useActionState<ActionState, FormData>(async (prev, formData) => {
    const result = await saveBlock(prev, formData);
    if (result.ok) setSaved(String(formData.get("value")));
    return result;
  }, IDLE);

  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  const panels = panelsFor(blockKey);

  return (
    <SpecProvider errors={state.fieldErrors ?? {}} solutions={solutions} storage={storage}>
      <form action={action} className="flex flex-col gap-6">
        <input type="hidden" name="key" value={blockKey} />
        <input type="hidden" name="value" value={serialized} />

        {panels.map((panel, i) => {
          const value = panel.at ? ((draft[panel.at] as Obj) ?? {}) : draft;
          const body = (
            <SpecForm
              fields={panel.fields}
              value={value}
              path={panel.at ?? ""}
              onChange={(next) => setDraft(panel.at ? { ...draft, [panel.at]: next } : next)}
            />
          );
          if (!panel.title) return <div key={i}>{body}</div>;
          return (
            <section key={i} className="flex flex-col gap-4 rounded-3xl p-5 ring-1 ring-fg/10 sm:p-6">
              <header>
                <h2 className="text-base font-[650] text-fg">{panel.title}</h2>
                {panel.description && <p className="mt-1 text-sm text-fg/80">{panel.description}</p>}
              </header>
              {body}
            </section>
          );
        })}

        <div
          className={
            compact
              ? "flex flex-wrap items-center gap-3 border-t border-fg/10 pt-4"
              : "sticky bottom-0 z-10 -mx-2 flex flex-wrap items-center gap-3 rounded-2xl bg-panel/95 px-2 py-3 backdrop-blur"
          }
        >
          <SubmitButton isDisabled={!dirty}>Enregistrer et publier</SubmitButton>
          {dirty ? (
            <span className="text-sm font-[650] text-fg">● Modifications non enregistrées</span>
          ) : (
            <span className="text-sm text-fg/80">À jour</span>
          )}
          <a
            href={viewHref}
            target="_blank"
            rel="noopener noreferrer"
            className="ml-auto inline-flex items-center gap-1.5 text-sm font-[650] text-fg underline underline-offset-4"
          >
            Voir sur le site
            <Icon name="external" className="h-4 w-4" />
          </a>
        </div>
        <FormAlert state={state} />
      </form>

      {stored && (
        <div className="mt-4">
          <ConfirmButton
            action={resetBlock}
            hidden={{ key: blockKey }}
            label="Revenir au texte d'origine"
            confirmLabel="Oui, revenir au texte d'origine"
            description="Vos modifications de ce bloc seront perdues et le texte fourni avec le site reviendra. Les autres blocs ne changent pas."
          />
        </div>
      )}
    </SpecProvider>
  );
}
