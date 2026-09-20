import { z } from "zod";
import { db } from "@/lib/db";
import { contactLeads } from "@/lib/db/schema";
import { sendEmail, adminEmail } from "@/lib/email";
import { SITE_URL } from "@/lib/site";

/**
 * The public contact form (`Contact.tsx`, `SolutionContact.tsx`).
 *
 * Turnstile decides whether the submitter is human; the submission is then
 * **stored** in `contact_leads` and surfaced in /admin/messages, and a copy is
 * e-mailed to the admin. It used to do neither — it verified the token, returned
 * `{ok:true}` and dropped the message, while the form told the visitor it had
 * been "bien enregistré". The database write is what makes that sentence true.
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

  try {
    const [lead] = await db
      .insert(contactLeads)
      .values({
        name: parsed.data.name,
        email: parsed.data.email,
        message: parsed.data.message,
        solution: parsed.data.solution,
      })
      .returning({ id: contactLeads.id });

    // The e-mail is a convenience, not the record of truth — so a mail provider
    // that is down or unconfigured must not turn a stored lead into an error the
    // visitor sees and retries.
    await sendEmail({
      to: adminEmail(),
      subject: `Message du site — ${parsed.data.name}`,
      text: `${parsed.data.name} <${parsed.data.email}>${parsed.data.solution ? `\nSolution : ${parsed.data.solution}` : ""}\n\n${parsed.data.message}`,
      action: { label: "Ouvrir la boîte de réception", url: `${SITE_URL}/admin/messages` },
    });

    return Response.json({ ok: true, id: lead.id });
  } catch (error) {
    console.error("[contact] failed to store lead", error);
    return Response.json({ ok: false, error: "storage_failed" }, { status: 500 });
  }
}
