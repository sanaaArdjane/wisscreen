"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { quotes } from "@/lib/db/schema";
import { requireUser } from "@/lib/guard";
import { logActivity, notify } from "@/lib/account";
import { parseForm, fail, type ActionState } from "@/lib/actions";
import { sendEmail, adminEmail } from "@/lib/email";
import { formatMoney } from "@/lib/money";
import { SITE_URL } from "@/lib/site";

const RespondSchema = z.object({
  quoteId: z.coerce.number().int().positive(),
  decision: z.enum(["accepte", "refuse"]),
});

/**
 * The client's accept/refuse.
 *
 * Only a quote in `envoye` can be answered, and the `WHERE` enforces both that
 * and ownership in the same statement — so a replayed form post after the desk
 * has already withdrawn the quote changes nothing rather than resurrecting it.
 */
export async function respondToQuote(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireUser();
  const parsed = parseForm(RespondSchema, formData);
  if (!parsed.ok) return parsed.state;

  const updated = await db
    .update(quotes)
    .set({ status: parsed.data.decision, updatedAt: new Date() })
    .where(
      and(
        eq(quotes.id, parsed.data.quoteId),
        eq(quotes.userId, user.id),
        eq(quotes.status, "envoye"),
      ),
    )
    .returning();

  if (updated.length === 0) {
    return fail("Ce devis n'est plus en attente de réponse.");
  }

  const quote = updated[0];
  const accepted = parsed.data.decision === "accepte";

  await logActivity({
    actorId: user.id,
    action: accepted ? "quote.accepted" : "quote.refused",
    entity: "quote",
    entityId: quote.id,
    meta: { ref: quote.ref, amountCents: quote.amountCents },
  });

  if (quote.createdById) {
    await notify({
      userId: quote.createdById,
      type: "quote",
      title: `Devis ${quote.ref} ${accepted ? "accepté" : "refusé"}`,
      body: `${user.name} — ${formatMoney(quote.amountCents, quote.currency)}`,
      href: `/admin/devis/${quote.id}`,
    });
  }

  await sendEmail({
    to: adminEmail(),
    subject: `Devis ${quote.ref} ${accepted ? "accepté" : "refusé"}`,
    text: `${user.name} (${user.email}) a ${accepted ? "accepté" : "refusé"} le devis « ${quote.title} » (${formatMoney(quote.amountCents, quote.currency)}).`,
    action: { label: "Ouvrir le devis", url: `${SITE_URL}/admin/devis/${quote.id}` },
  });

  revalidatePath(`/dashboard/devis/${quote.id}`);
  revalidatePath("/dashboard/devis");
  return {
    ok: true,
    message: accepted
      ? "Devis accepté. Notre équipe enchaîne et revient vers vous."
      : "Devis refusé. Vous pouvez nous dire ce qui bloque dans la demande liée.",
  };
}
