"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import {
  CheckboxField,
  ConfirmButton,
  Field,
  FormAlert,
  SubmitButton,
  TextAreaField,
} from "@/components/dashboard/ui";
import { IDLE, type ActionState } from "@/lib/actions";
import { answerDemoRun, deleteDemo, grantDemoAccess } from "./actions";

/** Grant a demo to one or several customers at once. */
export function GrantForm({
  demoId,
  clients,
}: {
  demoId: number;
  clients: { id: string; name: string; email: string; company: string | null }[];
}) {
  const [state, action] = useActionState<ActionState, FormData>(grantDemoAccess, IDLE);
  const [query, setQuery] = useState("");
  const ref = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.ok) ref.current?.reset();
  }, [state]);

  const q = query.trim().toLowerCase();
  const shown = q
    ? clients.filter((c) => `${c.name} ${c.email} ${c.company ?? ""}`.toLowerCase().includes(q))
    : clients;

  return (
    <form ref={ref} action={action} className="flex flex-col gap-4">
      <input type="hidden" name="demoId" value={demoId} />
      <FormAlert state={state} />
      {clients.length === 0 ? (
        <p className="text-sm text-fg/80">Tous les clients ont déjà accès à cette démo.</p>
      ) : (
        <>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Filtrer les clients…"
            className="rounded-2xl bg-soft px-3 py-2.5 text-sm text-fg placeholder:text-fg/80 focus:outline-none focus:ring-2 focus:ring-fg"
          />
          <div className="flex max-h-64 flex-col gap-1 overflow-y-auto rounded-2xl border border-fg/10 p-2">
            {clients.map((c) => (
              // Filtered by hiding, not unmounting — a checked box that scrolls
              // out of the filter must still post.
              <div key={c.id} className={shown.includes(c) ? undefined : "hidden"}>
                <CheckboxField
                  name="userId"
                  label={
                    <span>
                      <span className="font-[650]">{c.name}</span>{" "}
                      <span className="text-fg/80">
                        — {c.email}
                        {c.company ? ` · ${c.company}` : ""}
                      </span>
                    </span>
                  }
                />
              </div>
            ))}
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              name="expiresAt"
              label="Accès jusqu'au"
              type="date"
              description="Facultatif — ne peut pas dépasser la date de la démo."
            />
            <Field name="note" label="Note interne" placeholder="Pour la réunion du 12…" />
          </div>
          <SubmitButton className="self-start">Accorder l&apos;accès</SubmitButton>
        </>
      )}
    </form>
  );
}

/** The desk's answer to one customer submission. */
export function RunAnswerForm({ runId, outcome }: { runId: number; outcome: string }) {
  const [state, action] = useActionState<ActionState, FormData>(answerDemoRun, IDLE);
  return (
    <form action={action} className="flex flex-col gap-3">
      <input type="hidden" name="runId" value={runId} />
      <FormAlert state={state} />
      <TextAreaField
        name="note"
        label="Message au client"
        description="Accompagne le résultat. Joignez le livrable ci-dessus si besoin."
        rows={3}
      />
      <Field name="summary" label="Résumé du résultat" placeholder="12 champs extraits, 2 à vérifier…" />
      <div className="flex flex-wrap gap-2">
        <SubmitButton name="outcome" value="ok">
          Envoyer le résultat
        </SubmitButton>
        {outcome !== "en_cours" && (
          <SubmitButton variant="secondary" name="outcome" value="en_cours">
            Marquer en cours
          </SubmitButton>
        )}
        <SubmitButton variant="ghost" name="outcome" value="error">
          Impossible à traiter
        </SubmitButton>
      </div>
    </form>
  );
}

export function DeleteDemoForm({ demoId, slug }: { demoId: number; slug: string }) {
  const [state, action] = useActionState<ActionState, FormData>(deleteDemo, IDLE);
  return (
    <ConfirmButton
      action={action}
      label="Supprimer cette démo"
      hidden={{ demoId }}
      typeToConfirm={slug}
      description="Les accès, identifiants chiffrés et fichiers de cette démo seront supprimés. L'historique des exécutions est conservé."
      fullWidth
    >
      <FormAlert state={state} />
    </ConfirmButton>
  );
}

