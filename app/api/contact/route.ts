import { z } from "zod";

/**
 * Verifies the Cloudflare Turnstile token both contact forms submit
 * (`Contact.tsx`, `SolutionContact.tsx`) before accepting a submission.
 *
 * This route's job stops at "is the submitter human" — there is no email/CRM
 * provider wired in yet, so a verified submission is accepted but not actually
 * delivered anywhere. Wire in a real send (Resend, SMTP, …) here once there's a
 * provider and credentials for it.
 */

const ContactSchema = z.object({
  name: z.string().trim().min(1).max(200),
  email: z.string().trim().email().max(320),
  message: z.string().trim().min(1).max(5000),
  solution: z.string().trim().max(100).optional(),
});

const TURNSTILE_VERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

/**
 * `TURNSTILE_SECRET_KEY` unset → verification is skipped (returns true) rather than
 * rejecting every submission. Both keys land in `.env.local` together (see
 * `components/ui/Turnstile.tsx`, which skips rendering the widget under the same
 * condition on `NEXT_PUBLIC_TURNSTILE_SITE_KEY`), so until they're added the form
 * behaves exactly as it did before Turnstile existed instead of breaking outright.
 */
async function verifyTurnstile(token: string | null, remoteIp: string | null): Promise<boolean> {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) return true;
  if (!token) return false;

  const body = new URLSearchParams({ secret, response: token });
  if (remoteIp) body.set("remoteip", remoteIp);

  try {
    const res = await fetch(TURNSTILE_VERIFY_URL, {
      method: "POST",
      body,
      signal: AbortSignal.timeout(8000),
    });
    const data = (await res.json()) as { success?: boolean };
    return data.success === true;
  } catch {
    return false;
  }
}

export async function POST(request: Request) {
  const formData = await request.formData();

  const parsed = ContactSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    message: formData.get("message"),
    solution: formData.get("solution") || undefined,
  });
  if (!parsed.success) {
    return Response.json({ ok: false, error: "invalid_input" }, { status: 400 });
  }

  const token = formData.get("cf-turnstile-response");
  const remoteIp = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
  const verified = await verifyTurnstile(typeof token === "string" ? token : null, remoteIp);
  if (!verified) {
    return Response.json({ ok: false, error: "turnstile_failed" }, { status: 403 });
  }

  return Response.json({ ok: true });
}
