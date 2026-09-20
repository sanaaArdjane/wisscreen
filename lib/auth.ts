import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { admin as adminPlugin, magicLink } from "better-auth/plugins";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import * as schema from "@/lib/db/schema";
import { sendEmail, adminEmail } from "@/lib/email";
import { getSetting } from "@/lib/settings";
import { SITE_URL } from "@/lib/site";

/**
 * The auth instance. Email + password and Google are the primary paths; magic
 * link exists but is **off by default** and gated twice — once globally in
 * `app_settings.magicLinkEnabled`, once per account on `user.magicLinkEnabled`
 * — because the admin asked to be able to turn it on for themselves or for a
 * chosen user without opening it to everyone.
 *
 * Roles and suspension come from the `admin` plugin: `role`, `banned`,
 * `banReason`, `banExpires` on `user`, and `impersonatedBy` on `session`.
 * Authorization itself is *not* the plugin's access-control — it's `can()` in
 * `lib/permissions.ts`, because a per-user override layer is the requirement and
 * a static role→statement map can't express it. The plugin's own endpoints
 * (`listUsers`, `banUser`, `impersonate`) are still used, and they check
 * `role === "admin"`, so `adminRoles` stays at its default.
 */

/** Resolved on each sign-up, not at import — see the note on `adminEmail()`. */
function isOwnerEmail(email: string): boolean {
  return email.toLowerCase() === adminEmail().toLowerCase();
}

export const auth = betterAuth({
  appName: "WICLOUD",
  baseURL: process.env.BETTER_AUTH_URL ?? SITE_URL,
  secret: process.env.BETTER_AUTH_SECRET,
  // Production trusts exactly one origin. Development also trusts localhost on
  // any port, because `next dev` moves to a free port whenever 3000 is taken and
  // a fixed BETTER_AUTH_URL then makes every sign-in fail with "Invalid origin"
  // — a confusing error for what is only a port change.
  trustedOrigins:
    process.env.NODE_ENV === "production"
      ? [SITE_URL]
      : [SITE_URL, "http://localhost:*", "http://127.0.0.1:*"],

  database: drizzleAdapter(db, {
    provider: "pg",
    schema: {
      user: schema.user,
      session: schema.session,
      account: schema.account,
      verification: schema.verification,
    },
  }),

  user: {
    // Our own columns, declared so the adapter selects them and the session's
    // `user` object carries them — `can()` needs `permissions` on every request.
    additionalFields: {
      permissions: { type: "json", required: false, input: false },
      magicLinkEnabled: { type: "boolean", required: false, defaultValue: false, input: false },
      phone: { type: "string", required: false },
      company: { type: "string", required: false },
      adminNote: { type: "string", required: false, input: false },
      lastSeenAt: { type: "date", required: false, input: false },
    },
    deleteUser: {
      enabled: true,
      sendDeleteAccountVerification: async ({ user, url }) => {
        await sendEmail({
          to: user.email,
          subject: "Confirmer la suppression de votre compte WICLOUD",
          text: "Vous avez demandé la suppression de votre compte WICLOUD. Cette action est définitive : vos demandes, devis, factures et documents seront supprimés.\n\nSi vous n'êtes pas à l'origine de cette demande, ignorez cet e-mail.",
          action: { label: "Confirmer la suppression", url },
        });
      },
    },
  },

  emailAndPassword: {
    enabled: true,
    minPasswordLength: 10,
    requireEmailVerification: false,
    sendResetPassword: async ({ user, url }) => {
      await sendEmail({
        to: user.email,
        subject: "Réinitialiser votre mot de passe WICLOUD",
        text: "Vous avez demandé à réinitialiser votre mot de passe. Ce lien est valable une heure.\n\nSi vous n'êtes pas à l'origine de cette demande, aucune action n'est nécessaire.",
        action: { label: "Choisir un nouveau mot de passe", url },
      });
    },
  },

  emailVerification: {
    sendOnSignUp: true,
    autoSignInAfterVerification: true,
    sendVerificationEmail: async ({ user, url }) => {
      await sendEmail({
        to: user.email,
        subject: "Confirmez votre adresse e-mail",
        text: `Bienvenue sur WICLOUD, ${user.name}.\n\nConfirmez votre adresse pour activer votre espace client.`,
        action: { label: "Confirmer mon adresse", url },
      });
    },
  },

  socialProviders: {
    // Absent credentials would make Better Auth register a provider that 500s on
    // click, so it is only wired when both halves are actually set.
    ...(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
      ? {
          google: {
            clientId: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
          },
        }
      : {}),
  },

  session: {
    expiresIn: 60 * 60 * 24 * 30,
    updateAge: 60 * 60 * 24,
    cookieCache: { enabled: true, maxAge: 60 * 5 },
  },

  databaseHooks: {
    user: {
      create: {
        // The owner account is promoted on creation rather than by a seed script,
        // so signing up with that address is all it takes — there is no window in
        // which the platform has no admin and no manual SQL to remember.
        before: async (user) => ({
          data: {
            ...user,
            ...(isOwnerEmail(user.email)
              ? { role: "admin", magicLinkEnabled: true, emailVerified: true }
              : {}),
          },
        }),
      },
    },
  },

  plugins: [
    adminPlugin({
      defaultRole: "user",
      adminRoles: ["admin"],
      defaultBanReason: "Compte suspendu par un administrateur",
      bannedUserMessage:
        "Votre compte a été suspendu. Contactez-nous pour en connaître la raison.",
    }),

    magicLink({
      expiresIn: 60 * 10,
      sendMagicLink: async ({ email, url }) => {
        // Both gates are checked at send time, not only in the UI: the sign-in
        // form is a client component and hiding a button is not a control.
        if (!(await getSetting("magicLinkEnabled"))) {
          throw new Error("magic_link_disabled");
        }
        const [row] = await db
          .select({ enabled: schema.user.magicLinkEnabled })
          .from(schema.user)
          .where(eq(schema.user.email, email))
          .limit(1);
        // An unknown address is treated as allowed so the response doesn't reveal
        // whether an account exists; Better Auth won't mint a session for it.
        if (row && !row.enabled) throw new Error("magic_link_disabled_for_user");

        await sendEmail({
          to: email,
          subject: "Votre lien de connexion WICLOUD",
          text: "Voici votre lien de connexion. Il est valable 10 minutes et ne fonctionne qu'une fois.\n\nSi vous n'avez pas demandé à vous connecter, ignorez cet e-mail.",
          action: { label: "Se connecter", url },
        });
      },
    }),

    // Must stay last: it is what lets server actions set the session cookie.
    nextCookies(),
  ],
});

export type Session = typeof auth.$Infer.Session;
export type SessionUser = Session["user"];
