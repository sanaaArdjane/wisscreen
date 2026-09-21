"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Spinner } from "@heroui/react";
import { Field, FormAlert, SubmitButton } from "@/components/dashboard/ui";
import { IDLE, type ActionState } from "@/lib/actions";
import { authClient } from "@/lib/auth-client";
import { formatDateTime } from "@/lib/format";
import { Icon } from "@/components/ui/Icon";
import { updateProfile } from "@/app/(app)/dashboard/profil/actions";

/**
 * The profile page's three forms.
 *
 * Identity goes through a server action (it's ours to write); password and
 * sessions go through Better Auth's client, because those are its endpoints and
 * re-implementing them server-side would mean re-implementing its hashing and
 * its session revocation.
 */

export function IdentityForm({
  name,
  email,
  phone,
  company,
}: {
  name: string;
  email: string;
  phone?: string | null;
  company?: string | null;
}) {
  const [state, action] = useActionState<ActionState, FormData>(updateProfile, IDLE);

  return (
    <form action={action} className="flex flex-col gap-5">
      <FormAlert state={state} />
      <Field
        name="name"
        label="Nom complet"
        defaultValue={state.values?.name ?? name}
        error={state.fieldErrors?.name}
        autoComplete="name"
        isRequired
      />
      <Field
        name="email"
        label="Adresse e-mail"
        defaultValue={email}
        description="Contactez-nous pour changer l'adresse associée à votre compte."
        isDisabled
      />
      <div className="grid gap-5 sm:grid-cols-2">
        <Field
          name="phone"
          label="Téléphone"
          type="tel"
          inputMode="tel"
          defaultValue={state.values?.phone ?? phone ?? ""}
          error={state.fieldErrors?.phone}
          autoComplete="tel"
        />
        <Field
          name="company"
          label="Société"
          defaultValue={state.values?.company ?? company ?? ""}
          error={state.fieldErrors?.company}
          autoComplete="organization"
        />
      </div>
      <SubmitButton className="self-start">Enregistrer</SubmitButton>
    </form>
  );
}

export function PasswordForm({ hasPassword }: { hasPassword: boolean }) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  if (!hasPassword) {
    return (
      <p className="text-sm text-fg/80">
        Votre compte se connecte via Google. Pour ajouter un mot de passe, utilisez
        « Mot de passe oublié » depuis la page de connexion.
      </p>
    );
  }

  return (
    <form
      className="flex flex-col gap-5"
      onSubmit={async (event) => {
        event.preventDefault();
        const form = event.currentTarget;
        const data = new FormData(form);
        const next = String(data.get("newPassword") ?? "");

        if (next.length < 10) {
          setMessage({ ok: false, text: "Le nouveau mot de passe doit faire 10 caractères au moins." });
          return;
        }
        if (next !== String(data.get("confirm") ?? "")) {
          setMessage({ ok: false, text: "Les deux mots de passe ne correspondent pas." });
          return;
        }

        setBusy(true);
        const { error } = await authClient.changePassword({
          currentPassword: String(data.get("currentPassword") ?? ""),
          newPassword: next,
          // Everything else signs out: a password change is usually a reaction to
          // suspecting someone else has it, and leaving their sessions alive is
          // the one thing that must not happen.
          revokeOtherSessions: true,
        });
        setBusy(false);

        if (error) {
          setMessage({ ok: false, text: "Mot de passe actuel incorrect." });
          return;
        }
        form.reset();
        setMessage({
          ok: true,
          text: "Mot de passe modifié. Vos autres sessions ont été déconnectées.",
        });
      }}
    >
      {message && (
        <p
          role="status"
          className={
            message.ok
              ? "rounded-2xl bg-soft px-6 py-3.5 text-sm text-fg"
              : "rounded-2xl border border-fg/25 bg-panel px-6 py-3.5 text-sm text-fg"
          }
        >
          {message.text}
        </p>
      )}
      <Field
        name="currentPassword"
        label="Mot de passe actuel"
        type="password"
        autoComplete="current-password"
        isRequired
      />
      <div className="grid gap-5 sm:grid-cols-2">
        <Field
          name="newPassword"
          label="Nouveau mot de passe"
          type="password"
          autoComplete="new-password"
          description="10 caractères minimum."
          isRequired
        />
        <Field
          name="confirm"
          label="Confirmer"
          type="password"
          autoComplete="new-password"
          isRequired
        />
      </div>
      <Button type="submit" isDisabled={busy} className="self-start">
        {busy && <Spinner className="size-4" />}
        Changer le mot de passe
      </Button>
    </form>
  );
}

type SessionRow = {
  id: string;
  token: string;
  createdAt: Date | string;
  userAgent?: string | null;
  ipAddress?: string | null;
};

export function SessionList({ currentToken }: { currentToken: string }) {
  const [rows, setRows] = useState<SessionRow[] | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    // Fetched client-side rather than passed in from the page: revoking one has
    // to update this list immediately, and a server round-trip for a list the
    // client already has to re-read after every action is the slower path.
    void authClient.listSessions().then(({ data }) => setRows((data as SessionRow[]) ?? []));
  }, []);

  if (rows === null) {
    return (
      <p className="flex items-center gap-2 text-sm text-fg/80">
        <Spinner className="size-4" /> Chargement…
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <ul className="flex flex-col divide-y divide-fg/10">
        {rows.map((s) => {
          const current = s.token === currentToken;
          return (
            <li key={s.id} className="flex items-center gap-3 py-3">
              <Icon name="server" className="size-4 shrink-0 text-fg/80" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm text-fg">
                  {describeAgent(s.userAgent)}
                  {current && (
                    <span className="ml-2 rounded-full border border-signal/45 bg-signal/10 px-2.5 py-1 text-xs font-[650] text-fg">
                      Session actuelle
                    </span>
                  )}
                </p>
                <p className="mt-0.5 text-xs text-fg/80">
                  Depuis le {formatDateTime(s.createdAt)}
                  {s.ipAddress && ` · ${s.ipAddress}`}
                </p>
              </div>
              {!current && (
                <Button
                  variant="ghost"
                  isDisabled={busy}
                  onPress={async () => {
                    setBusy(true);
                    await authClient.revokeSession({ token: s.token });
                    const { data } = await authClient.listSessions();
                    setRows((data as SessionRow[]) ?? []);
                    setBusy(false);
                  }}
                >
                  Déconnecter
                </Button>
              )}
            </li>
          );
        })}
      </ul>

      {rows.length > 1 && (
        <Button
          variant="secondary"
          className="self-start"
          isDisabled={busy}
          onPress={async () => {
            setBusy(true);
            await authClient.revokeOtherSessions();
            const { data } = await authClient.listSessions();
            setRows((data as SessionRow[]) ?? []);
            setBusy(false);
          }}
        >
          Déconnecter tous les autres appareils
        </Button>
      )}
    </div>
  );
}

/** A readable name from a user-agent string. Best effort — it's a label, not data. */
function describeAgent(ua?: string | null): string {
  if (!ua) return "Appareil inconnu";
  const browser =
    /Edg\//.test(ua) ? "Edge"
    : /OPR\//.test(ua) ? "Opera"
    : /Firefox\//.test(ua) ? "Firefox"
    : /Chrome\//.test(ua) ? "Chrome"
    : /Safari\//.test(ua) ? "Safari"
    : "Navigateur";
  const os =
    /Android/.test(ua) ? "Android"
    : /iPhone|iPad/.test(ua) ? "iOS"
    : /Mac OS X/.test(ua) ? "macOS"
    : /Windows/.test(ua) ? "Windows"
    : /Linux/.test(ua) ? "Linux"
    : "";
  return os ? `${browser} · ${os}` : browser;
}

export function DeleteAccount() {
  const router = useRouter();
  const [armed, setArmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!armed) {
    return (
      <Button variant="tertiary" onPress={() => setArmed(true)}>
        Supprimer mon compte
      </Button>
    );
  }

  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={async (event) => {
        event.preventDefault();
        const password = String(new FormData(event.currentTarget).get("password") ?? "");
        setBusy(true);
        setError(null);
        const { error } = await authClient.deleteUser({ password });
        setBusy(false);
        if (error) {
          setError("Mot de passe incorrect, ou suppression indisponible pour ce compte.");
          return;
        }
        router.push("/");
        router.refresh();
      }}
    >
      <p className="rounded-2xl border border-fg/25 bg-panel px-6 py-3.5 text-sm text-fg">
        Cette action est définitive. Vos demandes, devis, factures et documents seront
        supprimés et ne pourront pas être restaurés.
      </p>
      {error && <p className="text-sm text-fg">{error}</p>}
      <Field
        name="password"
        label="Confirmez avec votre mot de passe"
        type="password"
        autoComplete="current-password"
        isRequired
      />
      <div className="flex gap-2">
        <Button type="submit" variant="secondary" isDisabled={busy}>
          {busy && <Spinner className="size-4" />}
          Supprimer définitivement
        </Button>
        <Button variant="ghost" onPress={() => setArmed(false)}>
          Annuler
        </Button>
      </div>
    </form>
  );
}
