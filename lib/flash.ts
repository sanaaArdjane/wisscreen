import { cookies } from "next/headers";

/**
 * One-shot messages for actions that return nothing — deletes, status changes,
 * anything that redirects. `useActionState` forms already carry their outcome in
 * `ActionState`; these don't have anywhere to put one.
 *
 * The message rides a short-lived cookie. Setting a cookie in a server action
 * makes Next re-render the current route and its layouts, and a redirect lands
 * on a layout that reads it, so the toast arrives on whichever page the person
 * ends up on without a query string or a client round trip. `AppShell` shows it
 * and clears the cookie.
 */
export const FLASH_COOKIE = "wc-flash";

export async function flash(message: string, ok = true): Promise<void> {
  (await cookies()).set(FLASH_COOKIE, JSON.stringify({ id: Date.now(), ok, message }), {
    path: "/",
    maxAge: 30,
    sameSite: "lax",
    // Read and cleared by the browser, so it cannot be HttpOnly. It carries a
    // sentence for the person who just did the thing, never an identifier.
    httpOnly: false,
  });
}

/** The raw pending message, for the layout to hand to the shell. */
export async function readFlash(): Promise<string | undefined> {
  return (await cookies()).get(FLASH_COOKIE)?.value;
}
