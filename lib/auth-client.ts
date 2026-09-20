"use client";

import { createAuthClient } from "better-auth/react";
import { adminClient, magicLinkClient, inferAdditionalFields } from "better-auth/client/plugins";
import type { auth } from "@/lib/auth";

/**
 * The browser half of Better Auth. `inferAdditionalFields<typeof auth>()` is what
 * carries our own `user` columns (`permissions`, `magicLinkEnabled`, `phone`, …)
 * into the client's types — without it `session.user.permissions` doesn't exist
 * as far as TypeScript is concerned, even though the server sends it.
 *
 * No `baseURL`: same-origin, so the default is right, and hardcoding one breaks
 * every preview deployment.
 */
export const authClient = createAuthClient({
  plugins: [inferAdditionalFields<typeof auth>(), adminClient(), magicLinkClient()],
});

export const { signIn, signUp, signOut, useSession, getSession } = authClient;
