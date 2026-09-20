import { defineConfig } from "@neon/config/v1";

/**
 * Neon infrastructure-as-code for WICLOUD. Applied with `pnpm neon:deploy`
 * (alias of `neon config apply`) against whichever branch `.neon` is linked to.
 *
 * `auth: false` on purpose — sign-in is Better Auth against this same Postgres
 * (`lib/auth.ts`), not Neon Auth, so there is no second identity store.
 *
 * The bucket is the reason this file isn't empty. Dashboard attachments (request
 * documents, quote PDFs, avatars) need blob storage, and Neon's is S3-compatible,
 * branch-scoped and injects `AWS_*` credentials into `.env.local` on deploy — so
 * it costs no extra provider, no extra account and no credentials to paste. It is
 * private: every read goes through a presigned URL from `lib/storage.ts`.
 */
export default defineConfig({
  auth: false,
  buckets: {
    documents: {},
  },
});
