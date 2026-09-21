"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, type FormEvent, type ReactNode } from "react";
import { Button, Spinner } from "@heroui/react";
import { authClient } from "@/lib/auth-client";
import { Field } from "@/components/dashboard/ui";
import { Icon } from "@/components/ui/Icon";

/**
 * Every signed-out form.
 *
 * They're hand-submitted rather than server actions because Better Auth's
 * browser client is what sets the session cookie and handles the OAuth
 * redirect — a server action would have to re-implement both. The trade is that
 * these are client components; they're tiny and behind no data fetch, so the
 * bundle cost is a few KB.
 *
 * Errors are mapped to French by `describeError`: Better Auth's codes are
 * stable and its English messages are not something to show a client.
 */

/**
 * Staff and admins land in the back-office; everyone else in their own space.
 * A staff member's client space is still reachable from the admin sidebar — this
 * only decides where sign-in *drops* them.
 */
function destinationFor(role: string | null | undefined): string {
  return role === "admin" || role === "staff" ? "/admin" : "/dashboard";
}

function describeError(code: string | undefined, fallback: string): string {
  switch (code) {
    case "INVALID_EMAIL_OR_PASSWORD":
      return "E-mail ou mot de passe incorrect.";
    case "USER_ALREADY_EXISTS":
      return "Un compte existe déjà avec cette adresse.";
    case "PASSWORD_TOO_SHORT":
      return "Le mot de passe doit contenir au moins 10 caractères.";
    case "EMAIL_NOT_VERIFIED":
      return "Confirmez votre adresse e-mail avant de vous connecter.";
    case "USER_BANNED":
    case "BANNED_USER":
      return "Ce compte est suspendu. Contactez-nous pour en connaître la raison.";
    default:
      return fallback;
  }
}

function Alert({ children, tone = "error" }: { children: ReactNode; tone?: "error" | "ok" }) {
  return (
    <p
      role="status"
      className={
        tone === "ok"
          ? "rounded-xl border border-signal/40 bg-signal/10 px-4 py-3 text-sm text-signal-deep"
          : "rounded-xl border border-ink/25 bg-ink/5 px-4 py-3 text-sm text-ink"
      }
    >
      {children}
    </p>
  );
}

function Heading({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="mb-8">
      <h1 className="text-3xl font-[650] leading-tight text-ink sm:text-4xl">{title}.</h1>
      {subtitle && <p className="mt-3 text-base font-light leading-relaxed text-ink/80">{subtitle}</p>}
    </div>
  );
}

function GoogleButton({ callbackURL }: { callbackURL: string }) {
  const [busy, setBusy] = useState(false);
  return (
    <Button
      variant="secondary"
      fullWidth
      isDisabled={busy}
      onPress={async () => {
        setBusy(true);
        await authClient.signIn.social({ provider: "google", callbackURL });
        // No `setBusy(false)`: this navigates away. Clearing it would only ever
        // run if the redirect failed, and then the spinner is the honest state.
      }}
    >
      {busy ? <Spinner className="size-4" /> : <GoogleMark />}
      Continuer avec Google
    </Button>
  );
}

function GoogleMark() {
  return (
    <svg viewBox="0 0 18 18" className="size-4" aria-hidden>
      <path
        fill="#4285F4"
        d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.7-1.57 2.68-3.88 2.68-6.62Z"
      />
      <path
        fill="#34A853"
        d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.8.54-1.84.86-3.04.86-2.34 0-4.32-1.58-5.03-3.7H.96v2.33A9 9 0 0 0 9 18Z"
      />
      <path
        fill="#FBBC05"
        d="M3.97 10.72a5.4 5.4 0 0 1 0-3.44V4.95H.96a9 9 0 0 0 0 8.1l3.01-2.33Z"
      />
      <path
        fill="#EA4335"
        d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58C13.46.9 11.43 0 9 0A9 9 0 0 0 .96 4.95l3.01 2.33C4.68 5.16 6.66 3.58 9 3.58Z"
      />
    </svg>
  );
}

function Divider() {
  return (
    <div className="my-6 flex items-center gap-3 text-sm text-ink/80">
      <span className="h-px flex-1 bg-ink/15" />
      ou
      <span className="h-px flex-1 bg-ink/15" />
    </div>
  );
}

/* ───────────────────────────────── Sign in ───────────────────────────────── */

export function SignInForm({
  googleEnabled,
  magicLinkEnabled,
}: {
  googleEnabled: boolean;
  /** The global switch from /admin/parametres. A user also needs their own flag —
   *  that half is enforced server-side in `lib/auth.ts`, since hiding a control
   *  is not a control. */
  magicLinkEnabled: boolean;
}) {
  const router = useRouter();
  const params = useSearchParams();
  /**
   * Where to land. An explicit `?next=` — set by `proxy.ts` when it bounced the
   * visitor off a protected page — always wins, because they were already trying
   * to get somewhere. Otherwise the destination depends on who signed in, which
   * is only known *after* the call, hence `destinationFor` below.
   *
   * This is what lets /admin stay unadvertised: nothing on the public site links
   * to it, and staff simply arrive there.
   */
  const explicitNext = params.get("next");
  const [error, setError] = useState<string | null>(null);
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [mode, setMode] = useState<"password" | "magic">("password");

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const email = String(form.get("email") ?? "");
    setError(null);
    setBusy(true);

    if (mode === "magic") {
      // A magic link is a server-side redirect, so the role isn't known here —
      // it goes to the client space, and staff can walk to /admin from there.
      const { error } = await authClient.signIn.magicLink({
        email,
        callbackURL: explicitNext ?? "/dashboard",
      });
      setBusy(false);
      if (error) {
        setError(
          "La connexion par lien n'est pas disponible pour ce compte. Utilisez votre mot de passe.",
        );
        return;
      }
      setSentTo(email);
      return;
    }

    const { data, error } = await authClient.signIn.email({
      email,
      password: String(form.get("password") ?? ""),
      rememberMe: true,
    });
    setBusy(false);
    if (error) {
      setError(describeError(error.code, "Connexion impossible. Réessayez."));
      return;
    }
    router.push(explicitNext ?? destinationFor(data?.user?.role));
    router.refresh();
  }

  if (sentTo) {
    return (
      <>
        <Heading title="Vérifiez vos e-mails" />
        <Alert tone="ok">
          Un lien de connexion a été envoyé à <strong>{sentTo}</strong>. Il est valable
          10 minutes.
        </Alert>
        <button
          type="button"
          onClick={() => setSentTo(null)}
          className="mt-4 text-sm text-signal-deep underline underline-offset-4"
        >
          Utiliser une autre méthode
        </button>
      </>
    );
  }

  return (
    <>
      <Heading title="Connexion" subtitle="Accédez à votre espace WICLOUD." />

      {googleEnabled && (
        <>
          {/* OAuth returns through a server redirect, so the role isn't available
              to branch on — Google sign-ins land in the client space. */}
          <GoogleButton callbackURL={explicitNext ?? "/dashboard"} />
          <Divider />
        </>
      )}

      <form onSubmit={onSubmit} className="flex flex-col gap-5">
        {error && <Alert>{error}</Alert>}

        <Field name="email" label="Adresse e-mail" type="email" autoComplete="email" isRequired />

        {mode === "password" && (
          <Field
            name="password"
            label="Mot de passe"
            type="password"
            autoComplete="current-password"
            isRequired
          />
        )}

        <Button type="submit" fullWidth isDisabled={busy}>
          {busy && <Spinner className="size-4" />}
          {mode === "magic" ? "Recevoir un lien de connexion" : "Se connecter"}
        </Button>
      </form>

      <div className="mt-5 flex flex-col gap-3 text-sm">
        {magicLinkEnabled && (
          <button
            type="button"
            onClick={() => {
              setMode(mode === "magic" ? "password" : "magic");
              setError(null);
            }}
            className="self-start font-semibold text-ink underline decoration-ink/25 underline-offset-4 hover:decoration-ink"
          >
            {mode === "magic"
              ? "Se connecter avec un mot de passe"
              : "Se connecter avec un lien par e-mail"}
          </button>
        )}
        <Link
          href="/mot-de-passe-oublie"
          className="self-start font-semibold text-ink underline decoration-ink/25 underline-offset-4 hover:decoration-ink"
        >
          Mot de passe oublié ?
        </Link>
      </div>

      <p className="mt-8 border-t border-ink/10 pt-6 text-sm text-ink/80">
        Pas encore de compte ?{" "}
        <Link href="/inscription" className="font-semibold text-ink underline decoration-ink/25 underline-offset-4 hover:decoration-ink">
          Créer un compte
        </Link>
      </p>
    </>
  );
}

/* ───────────────────────────────── Sign up ───────────────────────────────── */

export function SignUpForm({
  googleEnabled,
  registrationOpen,
}: {
  googleEnabled: boolean;
  registrationOpen: boolean;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (!registrationOpen) {
    return (
      <>
        <Heading title="Inscriptions fermées" />
        <Alert>
          Les nouvelles inscriptions sont momentanément suspendues. Écrivez-nous depuis la
          page contact et nous créerons votre accès.
        </Alert>
        <Link
          href="/connexion"
          className="mt-4 inline-block text-sm text-signal-deep underline underline-offset-4"
        >
          J&apos;ai déjà un compte
        </Link>
      </>
    );
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const password = String(form.get("password") ?? "");
    setError(null);

    if (password.length < 10) {
      setError("Le mot de passe doit contenir au moins 10 caractères.");
      return;
    }

    setBusy(true);
    const { error } = await authClient.signUp.email({
      name: String(form.get("name") ?? "").trim(),
      email: String(form.get("email") ?? ""),
      password,
      callbackURL: "/dashboard",
    });
    setBusy(false);
    if (error) {
      setError(describeError(error.code, "Création du compte impossible. Réessayez."));
      return;
    }
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <>
      <Heading title="Créer un compte" subtitle="Quelques secondes, et votre espace est prêt." />

      {googleEnabled && (
        <>
          <GoogleButton callbackURL="/dashboard" />
          <Divider />
        </>
      )}

      <form onSubmit={onSubmit} className="flex flex-col gap-5">
        {error && <Alert>{error}</Alert>}
        <Field name="name" label="Nom complet" autoComplete="name" isRequired />
        <Field name="email" label="Adresse e-mail" type="email" autoComplete="email" isRequired />
        <Field
          name="password"
          label="Mot de passe"
          type="password"
          autoComplete="new-password"
          description="10 caractères minimum."
          isRequired
        />
        <Button type="submit" fullWidth isDisabled={busy}>
          {busy && <Spinner className="size-4" />}
          Créer mon compte
        </Button>
      </form>

      <p className="mt-8 border-t border-ink/10 pt-6 text-sm text-ink/80">
        Déjà inscrit ?{" "}
        <Link href="/connexion" className="font-semibold text-ink underline decoration-ink/25 underline-offset-4 hover:decoration-ink">
          Se connecter
        </Link>
      </p>
    </>
  );
}

/* ──────────────────────────── Password recovery ──────────────────────────── */

export function ForgotPasswordForm() {
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const email = String(new FormData(event.currentTarget).get("email") ?? "");
    setBusy(true);
    await authClient.requestPasswordReset({ email, redirectTo: "/reinitialiser" });
    setBusy(false);
    // Always "sent", whatever the outcome: a different answer for a known and an
    // unknown address turns this form into an account-existence oracle.
    setSent(true);
  }

  if (sent) {
    return (
      <>
        <Heading title="Vérifiez vos e-mails" />
        <Alert tone="ok">
          Si un compte existe avec cette adresse, un lien de réinitialisation vient de
          partir. Il est valable une heure.
        </Alert>
        <Link
          href="/connexion"
          className="mt-4 inline-block text-sm text-signal-deep underline underline-offset-4"
        >
          Retour à la connexion
        </Link>
      </>
    );
  }

  return (
    <>
      <Heading
        title="Mot de passe oublié"
        subtitle="Nous vous enverrons un lien pour en choisir un nouveau."
      />
      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        <Field name="email" label="Adresse e-mail" type="email" autoComplete="email" isRequired />
        <Button type="submit" fullWidth isDisabled={busy}>
          {busy && <Spinner className="size-4" />}
          Envoyer le lien
        </Button>
      </form>
      <Link
        href="/connexion"
        className="mt-6 inline-block text-sm text-signal-deep underline underline-offset-4"
      >
        Retour à la connexion
      </Link>
    </>
  );
}

export function ResetPasswordForm() {
  const router = useRouter();
  const params = useSearchParams();
  const token = params.get("token");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (!token) {
    return (
      <>
        <Heading title="Lien invalide" />
        <Alert>
          Ce lien de réinitialisation est incomplet ou a expiré. Demandez-en un nouveau.
        </Alert>
        <Link
          href="/mot-de-passe-oublie"
          className="mt-4 inline-block text-sm text-signal-deep underline underline-offset-4"
        >
          Demander un nouveau lien
        </Link>
      </>
    );
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const password = String(form.get("password") ?? "");
    if (password !== String(form.get("confirm") ?? "")) {
      setError("Les deux mots de passe ne correspondent pas.");
      return;
    }
    if (password.length < 10) {
      setError("Le mot de passe doit contenir au moins 10 caractères.");
      return;
    }
    setError(null);
    setBusy(true);
    const { error } = await authClient.resetPassword({ newPassword: password, token: token! });
    setBusy(false);
    if (error) {
      setError("Ce lien a expiré. Demandez-en un nouveau.");
      return;
    }
    router.push("/connexion");
  }

  return (
    <>
      <Heading title="Nouveau mot de passe" />
      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        {error && <Alert>{error}</Alert>}
        <Field
          name="password"
          label="Nouveau mot de passe"
          type="password"
          autoComplete="new-password"
          description="10 caractères minimum."
          isRequired
        />
        <Field
          name="confirm"
          label="Confirmer le mot de passe"
          type="password"
          autoComplete="new-password"
          isRequired
        />
        <Button type="submit" fullWidth isDisabled={busy}>
          {busy && <Spinner className="size-4" />}
          Enregistrer
        </Button>
      </form>
    </>
  );
}

/* ───────────────────────────────── Dead ends ──────────────────────────────── */

export function SignOutLink() {
  const router = useRouter();
  return (
    <button
      type="button"
      onClick={async () => {
        await authClient.signOut();
        router.push("/connexion");
        router.refresh();
      }}
      className="inline-flex items-center gap-2 text-sm text-signal-deep underline underline-offset-4"
    >
      <Icon name="log-out" className="size-4" />
      Se déconnecter
    </button>
  );
}
