"use client";

import { useActionState } from "react";
import {
  CheckboxField,
  Field,
  FormAlert,
  SelectField,
  SubmitButton,
  type Option,
} from "@/components/dashboard/ui";
import { IDLE, type ActionState } from "@/lib/actions";
import type { Settings } from "@/lib/settings";
import { updateSettings } from "./actions";

export function SettingsForm({
  settings,
  planOptions,
}: {
  settings: Settings;
  planOptions: Option[];
}) {
  const [state, action] = useActionState<ActionState, FormData>(updateSettings, IDLE);

  return (
    <form action={action} className="flex flex-col gap-6">
      <FormAlert state={state} />

      <fieldset className="flex flex-col gap-4">
        <legend className="mb-1 text-sm font-[650] text-fg">Connexion</legend>

        <CheckboxField
          name="magicLinkEnabled"
          label="Autoriser la connexion par lien e-mail"
          description="Interrupteur global. Chaque compte doit en plus être autorisé individuellement depuis sa fiche — les deux doivent être actifs."
          defaultChecked={settings.magicLinkEnabled}
        />

        <CheckboxField
          name="registrationOpen"
          label="Autoriser la création de comptes"
          description="Désactivé, la page d'inscription affiche un message et refuse les envois."
          defaultChecked={settings.registrationOpen}
        />

        <CheckboxField
          name="requireEmailVerification"
          label="Exiger une adresse vérifiée avant l'accès au tableau de bord"
          defaultChecked={settings.requireEmailVerification}
        />
      </fieldset>

      <fieldset className="flex flex-col gap-4 border-t border-fg/10 pt-6">
        <legend className="mb-1 text-sm font-[650] text-fg">Nouveaux comptes</legend>
        <SelectField
          name="defaultPlan"
          label="Formule attribuée à l'inscription"
          options={planOptions}
          defaultValue={settings.defaultPlan}
          isRequired
        />
      </fieldset>

      <fieldset className="flex flex-col gap-4 border-t border-fg/10 pt-6">
        <legend className="mb-1 text-sm font-[650] text-fg">Bandeau d&apos;information</legend>
        <Field
          name="announcement"
          label="Message affiché en haut des tableaux de bord"
          description="Laissez vide pour masquer le bandeau."
          defaultValue={settings.announcement}
          placeholder="Maintenance planifiée dimanche de 2 h à 4 h."
        />
      </fieldset>

      <SubmitButton className="self-start">Enregistrer</SubmitButton>
    </form>
  );
}
