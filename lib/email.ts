import { Resend } from "resend";
import { SITE_NAME, SITE_URL } from "@/lib/site";

/**
 * Transactional email.
 *
 * `RESEND_API_KEY` unset → the message is logged and reported as sent, rather
 * than throwing. That is the same fail-soft contract `app/api/contact/route.ts`
 * already uses for Turnstile, and it is what lets the whole dashboard — sign-up,
 * password reset, magic link — be developed and demoed before anyone buys a
 * sending domain. The console line carries the verification/reset URL, so a
 * local sign-up flow is completable without a mailbox.
 *
 * It is *not* silent in production: `emailConfigured()` is surfaced in
 * /admin/parametres so the gap is visible rather than assumed.
 */

const FROM = process.env.EMAIL_FROM ?? `${SITE_NAME} <onboarding@resend.dev>`;
const ADMIN_EMAIL_FALLBACK = "sanaa.ardjane@wissalgroup.com";

let client: Resend | undefined;

export function emailConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY);
}

/**
 * Read per call, not captured at module scope. A module-scope constant is frozen
 * at first import — change `ADMIN_EMAIL` in `.env.local` and a dev server that
 * had already loaded this file keeps the old value, which is exactly how the
 * owner's first sign-up silently failed to be promoted.
 */
export function adminEmail(): string {
  return process.env.ADMIN_EMAIL ?? ADMIN_EMAIL_FALLBACK;
}

export async function sendEmail(input: {
  to: string;
  subject: string;
  /** Plain text. The HTML body is generated from it by `wrap()` below. */
  text: string;
  /** Optional call-to-action rendered as a button in the HTML part. */
  action?: { label: string; url: string };
}): Promise<{ ok: boolean; skipped?: boolean; error?: string }> {
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    console.info(
      `[email:skipped] to=${input.to} subject=${JSON.stringify(input.subject)}` +
        (input.action ? ` url=${input.action.url}` : "") +
        `\n${input.text}`,
    );
    return { ok: true, skipped: true };
  }

  client ??= new Resend(key);
  try {
    const { error } = await client.emails.send({
      from: FROM,
      to: input.to,
      subject: input.subject,
      text: input.action ? `${input.text}\n\n${input.action.url}` : input.text,
      html: wrap(input.text, input.action),
    });
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "send_failed" };
  }
}

/**
 * One inline-styled template for every message. Inline styles, a table-free
 * layout and no web fonts — the three things mail clients reliably agree on.
 * Colours are the brand's: `ink` ground for the header, `signal` for the button
 * with a dark label (the accent is a bright mid-tone, so white on it is 2.3:1).
 */
function wrap(text: string, action?: { label: string; url: string }): string {
  const paragraphs = text
    .trim()
    .split(/\n{2,}/)
    .map(
      (p) =>
        `<p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#354666">${escapeHtml(p).replace(/\n/g, "<br>")}</p>`,
    )
    .join("");

  const button = action
    ? `<p style="margin:24px 0 0"><a href="${escapeHtml(action.url)}" style="display:inline-block;background:#13b78c;color:#26334c;font-weight:600;font-size:15px;text-decoration:none;padding:12px 24px;border-radius:999px">${escapeHtml(action.label)}</a></p>`
    : "";

  return `<!doctype html><html lang="fr"><body style="margin:0;background:#eef2f6;padding:32px 16px;font-family:'Segoe UI',Arial,Helvetica,sans-serif">
  <div style="max-width:560px;margin:0 auto;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid rgba(53,70,102,.12)">
    <div style="background:#354666;padding:20px 28px">
      <span style="color:#ffffff;font-size:18px;font-weight:600;letter-spacing:-.02em">WI<span style="color:#4ed39d">CLOUD</span></span>
    </div>
    <div style="padding:28px">${paragraphs}${button}</div>
    <div style="padding:16px 28px;border-top:1px solid rgba(53,70,102,.1)">
      <p style="margin:0;font-size:12px;color:rgba(53,70,102,.7)">${SITE_NAME} — <a href="${SITE_URL}" style="color:#0d7d55">${SITE_URL.replace(/^https?:\/\//, "")}</a></p>
    </div>
  </div>
</body></html>`;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
