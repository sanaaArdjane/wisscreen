"use client";

import { useActionState, useState } from "react";
import {
  CheckboxField,
  Field,
  FormAlert,
  SubmitButton,
  TextAreaField,
  type Option,
} from "@/components/dashboard/ui";
import { IDLE, type ActionState } from "@/lib/actions";
import { SEGMENTS } from "./segments";
import { broadcast } from "./actions";

/**
 * Compose a broadcast.
 *
 * The recipient count for the chosen segment is rendered from counts the server
 * already computed and passed in — a number next to a "send to everyone" button
 * is the only thing standing between a slip of the mouse and 400 e-mails.
 */
export function BroadcastForm({
  counts,
  planOptions,
}: {
  counts: Record<string, number>;
  planOptions: Option[];
}) {
  const [state, action] = useActionState<ActionState, FormData>(broadcast, IDLE);
  const [segment, setSegment] = useState<string>(SEGMENTS[0].value);
  const [planSlug, setPlanSlug] = useState<string>(planOptions[0]?.value ?? "");

  const recipients =
    segment === "plan" ? (counts[`plan:${planSlug}`] ?? 0) : (counts[segment] ?? 0);

  return (
    <form action={action} className="flex flex-col gap-5">
      <FormAlert state={state} />

      {/* A native select, not the HeroUI one: this needs an onChange to drive the
          recipient count, and RAC's Select reports selection by key through a
          different callback — one control, one behaviour, no wrapper. */}
      <label className="flex flex-col gap-1.5">
        <span className="text-sm text-ink/80">Destinataires</span>
        <select
          name="segment"
          value={segment}
          onChange={(e) => setSegment(e.target.value)}
          className="rounded-xl border border-ink/15 bg-paper px-3 py-2.5 text-sm text-ink focus:border-signal-deep focus:outline-none focus:ring-1 focus:ring-signal-deep"
        >
          {SEGMENTS.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
      </label>

      {segment === "plan" && (
        <label className="flex flex-col gap-1.5">
          <span className="text-sm text-ink/80">Formule</span>
          <select
            name="planSlug"
            value={planSlug}
            onChange={(e) => setPlanSlug(e.target.value)}
            className="rounded-xl border border-ink/15 bg-paper px-3 py-2.5 text-sm text-ink focus:border-signal-deep focus:outline-none focus:ring-1 focus:ring-signal-deep"
          >
            {planOptions.map((p) => (
              <option key={p.value} value={p.value}>
                {p.label}
              </option>
            ))}
          </select>
        </label>
      )}

      <p className="rounded-xl border border-ink/15 bg-mist px-4 py-3 text-sm text-ink">
        <strong className="font-semibold">{recipients}</strong> destinataire
        {recipients > 1 ? "s" : ""} recevront ce message.
      </p>

      <Field
        name="title"
        label="Titre"
        placeholder="Maintenance planifiée dimanche"
        error={state.fieldErrors?.title}
        isRequired
      />
      <TextAreaField
        name="body"
        label="Message"
        rows={4}
        error={state.fieldErrors?.body}
      />
      <Field
        name="href"
        label="Lien (facultatif)"
        placeholder="/dashboard/abonnement"
        description="Chemin interne vers lequel la notification renvoie."
      />

      <CheckboxField name="alsoEmail" label="Envoyer aussi par e-mail" />

      <SubmitButton className="self-start">Envoyer</SubmitButton>
    </form>
  );
}
