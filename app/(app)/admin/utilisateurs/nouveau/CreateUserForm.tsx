"use client";

import Link from "next/link";
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
import { createAccount } from "../actions";

/**
 * Open an account for someone: a client who called in, or a colleague who needs
 * the back-office.
 *
 * The password field is optional on purpose — left blank, the server generates
 * one and shows it in the success banner **once**. That is the whole reason this
 * page is not just "send them the sign-up link": an admin on the phone needs a
 * credential they can read out now.
 */
export function CreateUserForm({
  roleOptions,
  planOptions,
  canCreateStaff,
}: {
  roleOptions: Option[];
  planOptions: Option[];
  canCreateStaff: boolean;
}) {
  const [state, action] = useActionState<ActionState, FormData>(createAccount, IDLE);
  const v = state.values ?? {};
  const createdId = state.ok ? v.createdId : undefined;

  return (
    <form action={action} className="flex flex-col gap-5">
      <FormAlert state={state} />

      {createdId && (
        <Link
          href={`/admin/utilisateurs/${createdId}`}
          className="text-sm font-[650] text-fg underline underline-offset-4"
        >
          Ouvrir la fiche du nouveau compte
        </Link>
      )}

      <div className="grid gap-5 sm:grid-cols-2">
        <Field
          name="name"
          label="Nom complet"
          defaultValue={v.name}
          error={state.fieldErrors?.name}
          isRequired
        />
        <Field
          name="email"
          label="Adresse e-mail"
          type="email"
          defaultValue={v.email}
          error={state.fieldErrors?.email}
          isRequired
        />
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field name="company" label="Société" defaultValue={v.company} />
        <Field name="phone" label="Téléphone" type="tel" defaultValue={v.phone} />
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <SelectField
          name="role"
          label="Rôle"
          description={
            canCreateStaff
              ? "« Équipe » et « Administrateur » donnent accès au back-office."
              : "Vous ne pouvez créer que des comptes clients."
          }
          options={roleOptions}
          defaultValue={v.role ?? "user"}
          error={state.fieldErrors?.role}
          isRequired
        />
        <SelectField
          name="planSlug"
          label="Formule"
          description="Par défaut, celle définie dans les paramètres."
          options={planOptions}
          defaultValue={v.planSlug}
          placeholder="Formule par défaut"
        />
      </div>

      <Field
        name="password"
        label="Mot de passe provisoire"
        type="password"
        description="Laissez vide pour en générer un — il s'affichera une seule fois."
        error={state.fieldErrors?.password}
      />

      <CheckboxField
        name="sendInvite"
        label="Envoyer les identifiants par e-mail"
        description="Le message contient l'adresse et le mot de passe provisoire."
      />

      <SubmitButton className="self-start">Créer le compte</SubmitButton>
    </form>
  );
}
