import { NextResponse, type NextRequest } from "next/server";

/**
 * Next 16 renamed `middleware.ts` to `proxy.ts` (same mechanism — see
 * `node_modules/next/dist/docs/01-app/01-getting-started/16-proxy.md`).
 *
 * This is an **optimistic** check and nothing more: it looks for a session
 * cookie and bounces anonymous traffic before it can spin up a dashboard
 * render. It deliberately does not validate the session, look up a role, or
 * touch the database — Next's own docs warn against using this layer as the
 * authorization boundary, and a proxy that trusts a cookie's *existence* is
 * exactly the bug that makes people think they are protected when they are not.
 *
 * The real checks are `requireUser` / `requireStaff` / `requirePermission` in
 * `lib/guard.ts`, which every page and every server action calls.
 *
 * The cookie is read by name rather than with Better Auth's `getSessionCookie`
 * helper: `better-auth/cookies` declares a `dev-source` export condition
 * pointing at `./src/cookies/index.ts`, which the published package does not
 * ship, so `next dev` fails to resolve it while `next build` succeeds. Reading
 * the name here also keeps the auth library out of the proxy bundle entirely,
 * which is the right shape for a layer that runs on every request.
 */

/** Better Auth's default cookie name, and the `__Secure-` form it uses on HTTPS. */
const SESSION_COOKIES = ["better-auth.session_token", "__Secure-better-auth.session_token"];

export function proxy(request: NextRequest) {
  const signedIn = SESSION_COOKIES.some((name) => request.cookies.has(name));
  if (signedIn) return NextResponse.next();

  const url = new URL("/connexion", request.url);
  url.searchParams.set("next", request.nextUrl.pathname + request.nextUrl.search);
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/dashboard/:path*", "/admin/:path*"],
};
