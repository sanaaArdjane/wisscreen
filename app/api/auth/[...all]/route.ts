import { auth } from "@/lib/auth";
import { toNextJsHandler } from "better-auth/next-js";

/** Every Better Auth endpoint — sign-in/up/out, OAuth callbacks, verification. */
export const { GET, POST } = toNextJsHandler(auth);
