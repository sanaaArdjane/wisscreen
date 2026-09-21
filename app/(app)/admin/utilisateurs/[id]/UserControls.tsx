"use client";

import { useActionState, useState } from "react";
import { Button } from "@heroui/react";
import {
  CheckboxField,
  Field,
  FormAlert,
  SelectField,
  SubmitButton,
  TextAreaField,
  type Option,
} from "@/components/dashboard/ui";
import { IDLE, type ActionState } from "@/lib/actions";
import {
  ACTION_LABELS,
  ALL_PERMISSIONS,
  DOMAIN_LABELS,
  DOMAINS,
  isRoleDefault,
  type Action,
  type Domain,
  type PermissionKey,
} from "@/lib/permissions";
import { cn } from "@/lib/cn";
import {
  changeRole,
  deleteUser,
  impersonate,
  messageUser,
  setQuota,
  suspendUser,
  unsuspendUser,
  updatePermissions,
  updateSubscription,
  updateUser,
} from "../actions";

/** Every control on the admin user page. One form per action, one action per form. */

export function UserProfileForm({
  userId,
  name,
  phone,
  company,
  adminNote,
  magicLinkEnabled,
}: {
  userId: string;
  name: string;
  phone?: string | null;
  company?: string | null;
  adminNote?: string | null;
  magicLinkEnabled: boolean;
}) {
  const [state, action] = useActionState<ActionState, FormData>(updateUser, IDLE);

  return (
    <form action={action} className="flex flex-col gap-5">
      <input type="hidden" name="userId" value={userId} />
      <FormAlert state={state} />
      <Field name="name" label="Nom" defaultValue={name} error={state.fieldErrors?.name} isRequired />
      <div className="grid gap-5 sm:grid-cols-2">
        <Field name="phone" label="Téléphone" type="tel" defaultValue={phone ?? ""} />
        <Field name="company" label="Société" defaultValue={company ?? ""} />
      </div>
      <TextAreaField
        name="adminNote"
        label="Note interne"
        description="Visible uniquement par l'équipe."
        defaultValue={adminNote ?? ""}
        rows={3}
      />
      <CheckboxField
        name="magicLinkEnabled"
        label="Autoriser la connexion par lien e-mail pour ce compte"
        description="Nécessite également que la connexion par lien soit activée globalement dans les paramètres."
        defaultChecked={magicLinkEnabled}
      />
      <SubmitButton className="self-start">Enregistrer</SubmitButton>
    </form>
  );
}

export function RoleForm({
  userId,
  role,
  roles,
  isSelf,
}: {
  userId: string;
  role: string;
  roles: Option[];
  isSelf: boolean;
}) {
  const [state, action] = useActionState<ActionState, FormData>(changeRole, IDLE);

  if (isSelf) {
    return (
      <p className="text-sm text-fg/80">
        Vous ne pouvez pas modifier votre propre rôle. Demandez à un autre administrateur.
      </p>
    );
  }

  return (
    <form action={action} className="flex flex-col gap-4">
      <input type="hidden" name="userId" value={userId} />
      <FormAlert state={state} />
      <SelectField name="role" label="Rôle" options={roles} defaultValue={role} isRequired />
      <SubmitButton variant="secondary" className="self-start">
        Changer le rôle
      </SubmitButton>
    </form>
  );
}

/**
 * The permission matrix.
 *
 * Every checkbox posts, so the submit carries the full state. A cell that
 * differs from the role's default is flagged — otherwise a matrix of forty
 * checkboxes gives no clue which two were deliberately changed.
 */
export function PermissionMatrix({
  userId,
  role,
  effective,
  isSelf,
}: {
  userId: string;
  role: string;
  effective: Record<PermissionKey, boolean>;
  isSelf: boolean;
}) {
  const [state, action] = useActionState<ActionState, FormData>(updatePermissions, IDLE);
  // Seeded from the server's computed set. The parent passes `key={role}`, so
  // changing someone's role remounts this and reseeds the draft — without that,
  // the boxes keep showing the *old* role's defaults and the next save writes
  // every one of them as an explicit exception, permanently pinning the account
  // to permissions it was just promoted out of.
  const [draft, setDraft] = useState(effective);

  if (isSelf) {
    return (
      <p className="text-sm text-fg/80">
        Vous ne pouvez pas modifier vos propres accès.
      </p>
    );
  }

  const actions: Action[] = ["read", "write", "delete"];

  return (
    <form action={action} className="flex flex-col gap-4">
      <input type="hidden" name="userId" value={userId} />
      <FormAlert state={state} />

      <div className="overflow-x-auto">
        <table className="w-full min-w-[34rem] text-sm">
          <thead>
            <tr className="text-left text-xs text-fg/80">
              <th scope="col" className="rounded-l-2xl bg-soft px-4 py-2.5 font-[650]">
                Domaine
              </th>
              {actions.map((a) => (
                <th key={a} scope="col" className="bg-soft px-2 py-2.5 text-center font-[650] last:rounded-r-2xl">
                  {ACTION_LABELS[a]}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-fg/5">
            {DOMAINS.map((domain: Domain) => (
              <tr key={domain}>
                <th scope="row" className="py-2 pr-4 text-left font-normal text-fg">
                  {DOMAIN_LABELS[domain]}
                </th>
                {actions.map((a) => {
                  const key = `${domain}:${a}` as PermissionKey;
                  const checked = draft[key];
                  const overridden = checked !== isRoleDefault(role, key);
                  return (
                    <td key={key} className="py-2 text-center">
                      <label
                        className={cn(
                          "inline-flex size-7 cursor-pointer items-center justify-center rounded-md border transition-colors",
                          checked
                            ? "border-signal bg-signal"
                            : "border-fg/15 bg-panel hover:border-fg/30",
                          overridden && "ring-1 ring-fg/40",
                        )}
                        title={
                          overridden
                            ? `Exception au rôle « ${role} »`
                            : `Valeur par défaut du rôle « ${role} »`
                        }
                      >
                        <input
                          type="checkbox"
                          name={key}
                          checked={checked}
                          onChange={(e) =>
                            setDraft((d) => ({ ...d, [key]: e.target.checked }))
                          }
                          className="sr-only"
                        />
                        <span className="sr-only">
                          {DOMAIN_LABELS[domain]} — {ACTION_LABELS[a]}
                        </span>
                        {checked && (
                          <svg viewBox="0 0 24 24" className="size-4 text-abyss" aria-hidden>
                            <path
                              d="M5 12l5 5L19 7"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2.5"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          </svg>
                        )}
                      </label>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-fg/80">
        Les cases entourées sont des exceptions au rôle. Seules les exceptions sont
        enregistrées : si vous changez le rôle plus tard, le reste suit automatiquement.
      </p>

      <div className="flex gap-2">
        <SubmitButton className="self-start">Enregistrer les accès</SubmitButton>
        <Button
          variant="ghost"
          onPress={() =>
            setDraft(
              Object.fromEntries(
                ALL_PERMISSIONS.map((k) => [k, isRoleDefault(role, k)]),
              ) as Record<PermissionKey, boolean>,
            )
          }
        >
          Réinitialiser au rôle
        </Button>
      </div>
    </form>
  );
}

export function SubscriptionForm({
  userId,
  planSlug,
  status,
  note,
  planOptions,
}: {
  userId: string;
  planSlug?: string;
  status?: string;
  note?: string | null;
  planOptions: Option[];
}) {
  const [state, action] = useActionState<ActionState, FormData>(updateSubscription, IDLE);

  return (
    <form action={action} className="flex flex-col gap-4">
      <input type="hidden" name="userId" value={userId} />
      <FormAlert state={state} />
      <SelectField
        name="planSlug"
        label="Formule"
        options={planOptions}
        defaultValue={planSlug ?? planOptions[0]?.value}
        isRequired
      />
      <SelectField
        name="status"
        label="Statut"
        options={[
          { value: "active", label: "Active" },
          { value: "trialing", label: "Période d'essai" },
          { value: "past_due", label: "Paiement en retard" },
          { value: "paused", label: "En pause" },
          { value: "cancelled", label: "Résiliée" },
        ]}
        defaultValue={status ?? "active"}
        isRequired
      />
      <TextAreaField name="note" label="Note" defaultValue={note ?? ""} rows={2} />
      <CheckboxField name="resetQuotas" label="Réappliquer les quotas de la formule" />
      <SubmitButton className="self-start">Enregistrer</SubmitButton>
    </form>
  );
}

export function QuotaForm({
  userId,
  metric,
  label,
  limit,
  used,
}: {
  userId: string;
  metric: string;
  label: string;
  limit: number | null;
  used: number;
}) {
  const [state, action] = useActionState<ActionState, FormData>(setQuota, IDLE);

  return (
    <form action={action} className="flex flex-wrap items-end gap-3">
      <input type="hidden" name="userId" value={userId} />
      <input type="hidden" name="metric" value={metric} />
      <Field
        name="limit"
        label={`${label} — limite`}
        description="Vide = illimité, 0 = non inclus"
        defaultValue={limit === null ? "" : String(limit)}
        error={state.fieldErrors?.limit}
        inputMode="numeric"
        className="w-44"
      />
      <Field
        name="used"
        label="Consommé"
        defaultValue={String(used)}
        error={state.fieldErrors?.used}
        inputMode="numeric"
        className="w-32"
      />
      <SubmitButton variant="secondary">Appliquer</SubmitButton>
      {state.message && (
        <p className="w-full text-sm text-fg/80">{state.message}</p>
      )}
    </form>
  );
}

export function SuspendForm({
  userId,
  banned,
  banReason,
  isSelf,
}: {
  userId: string;
  banned: boolean;
  banReason?: string | null;
  isSelf: boolean;
}) {
  const [state, action] = useActionState<ActionState, FormData>(suspendUser, IDLE);
  const [armed, setArmed] = useState(false);

  if (isSelf) {
    return <p className="text-sm text-fg/80">Vous ne pouvez pas suspendre votre propre compte.</p>;
  }

  if (banned) {
    return (
      <div className="flex flex-col gap-3">
        <p className="rounded-2xl border border-fg/25 bg-panel px-4 py-3 text-sm text-fg">
          Compte suspendu{banReason ? ` — ${banReason}` : ""}. Les sessions ont été révoquées.
        </p>
        <form action={unsuspendUser}>
          <input type="hidden" name="userId" value={userId} />
          <Button type="submit" variant="secondary">
            Réactiver le compte
          </Button>
        </form>
      </div>
    );
  }

  if (!armed) {
    return (
      <Button variant="tertiary" onPress={() => setArmed(true)}>
        Suspendre ce compte
      </Button>
    );
  }

  return (
    <form action={action} className="flex flex-col gap-4">
      <input type="hidden" name="userId" value={userId} />
      <FormAlert state={state} />
      <Field
        name="reason"
        label="Motif"
        description="Affiché à la personne sur la page de connexion."
        placeholder="Impayés en cours de régularisation"
      />
      <div className="flex gap-2">
        <SubmitButton variant="secondary">Confirmer la suspension</SubmitButton>
        <Button variant="ghost" onPress={() => setArmed(false)}>
          Annuler
        </Button>
      </div>
    </form>
  );
}

export function MessageForm({ userId }: { userId: string }) {
  const [state, action] = useActionState<ActionState, FormData>(messageUser, IDLE);

  return (
    <form action={action} className="flex flex-col gap-4">
      <input type="hidden" name="userId" value={userId} />
      <FormAlert state={state} />
      <Field
        name="title"
        label="Titre"
        placeholder="Mise à jour de votre dossier"
        error={state.fieldErrors?.title}
        isRequired
      />
      <TextAreaField name="body" label="Message" rows={3} error={state.fieldErrors?.body} />
      <CheckboxField name="alsoEmail" label="Envoyer aussi par e-mail" />
      <SubmitButton className="self-start">Envoyer</SubmitButton>
    </form>
  );
}

export function ImpersonateButton({ userId, isSelf }: { userId: string; isSelf: boolean }) {
  if (isSelf) return null;
  return (
    <form action={impersonate}>
      <input type="hidden" name="userId" value={userId} />
      <Button type="submit" variant="secondary">
        Voir la plateforme comme cet utilisateur
      </Button>
    </form>
  );
}

export function DeleteUserForm({ userId, email }: { userId: string; email: string }) {
  const [state, action] = useActionState<ActionState, FormData>(deleteUser, IDLE);
  const [armed, setArmed] = useState(false);

  if (!armed) {
    return (
      <Button variant="tertiary" onPress={() => setArmed(true)}>
        Supprimer définitivement ce compte
      </Button>
    );
  }

  return (
    <form action={action} className="flex flex-col gap-4">
      <input type="hidden" name="userId" value={userId} />
      <FormAlert state={state} />
      <p className="rounded-2xl border border-fg/25 bg-panel px-4 py-3 text-sm text-fg">
        Cette action supprime le compte et, en cascade, ses demandes, messages, devis,
        factures, documents et notifications. Elle est irréversible.
      </p>
      <Field
        name="confirm"
        label={`Saisissez « ${email} » pour confirmer`}
        placeholder={email}
        isRequired
      />
      <div className="flex gap-2">
        <SubmitButton variant="secondary">Supprimer définitivement</SubmitButton>
        <Button variant="ghost" onPress={() => setArmed(false)}>
          Annuler
        </Button>
      </div>
    </form>
  );
}
