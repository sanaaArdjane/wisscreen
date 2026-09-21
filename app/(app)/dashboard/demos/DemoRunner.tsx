"use client";

import { useActionState, useState } from "react";
import { Button } from "@heroui/react";
import { FormAlert, SubmitButton, TextAreaField } from "@/components/dashboard/ui";
import { IDLE, type ActionState } from "@/lib/actions";
import type { DemoResult } from "@/lib/demo";
import { runDemo } from "./actions";

/**
 * One scenario's input box and its latest result.
 *
 * There is no client-side copy of the result: the action writes the run and
 * calls `revalidatePath`, so the server component re-renders and hands this
 * component the stored row as `lastResult`. One source of truth, and the detail
 * survives a reload — which a piece of `useState` would not.
 */
export function DemoRunner({
  slug,
  inputLabel,
  placeholder,
  sample,
  lastResult,
}: {
  slug: string;
  inputLabel: string;
  placeholder: string;
  sample: string;
  lastResult?: DemoResult | null;
}) {
  const [state, action] = useActionState<ActionState, FormData>(runDemo, IDLE);
  // Keyed so "remettre l'exemple" actually resets an uncontrolled textarea the
  // person has typed into; a `defaultValue` change alone would do nothing.
  const [resetKey, setResetKey] = useState(0);

  return (
    <form action={action} className="flex flex-col gap-4">
      <input type="hidden" name="slug" value={slug} />

      <TextAreaField
        key={resetKey}
        name="input"
        label={inputLabel}
        placeholder={placeholder}
        defaultValue={state.values?.input ?? sample}
        error={state.fieldErrors?.input}
        rows={5}
        isRequired
      />

      <div className="flex flex-wrap items-center gap-2">
        <SubmitButton>Lancer la démo</SubmitButton>
        <Button variant="ghost" onPress={() => setResetKey((k) => k + 1)}>
          Remettre l&apos;exemple
        </Button>
      </div>

      {state.message && !state.ok && <FormAlert state={state} />}

      {lastResult && <ResultPanel result={lastResult} />}
    </form>
  );
}

function ResultPanel({ result }: { result: DemoResult }) {
  return (
    <div className="rounded-2xl bg-soft px-4 py-3">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="text-sm font-[650] text-fg">{result.summary}</p>
        <span className="rounded-full border border-fg/20 px-2 py-0.5 text-[11px] text-fg/80">
          Résultat simulé
        </span>
      </div>
      <dl className="mt-3 flex flex-col gap-1.5 text-sm">
        {result.fields.map((f) => (
          <div key={f.label} className="flex items-baseline justify-between gap-4">
            <dt className="text-fg/80">{f.label}</dt>
            <dd className="text-right font-[650] text-fg">
              {f.value}
              {typeof f.confidence === "number" && (
                <span className="ml-2 text-xs font-normal tabular-nums text-fg/80">
                  {Math.round(f.confidence * 100)} %
                </span>
              )}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
