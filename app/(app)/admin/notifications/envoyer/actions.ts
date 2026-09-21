"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { and, eq, gte, inArray, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { subscriptions, user as userTable } from "@/lib/db/schema";
import { requirePermission } from "@/lib/guard";
import { logActivity, notifyMany } from "@/lib/account";
import { checkbox, fail, optionalText, parseForm, succeed, type ActionState } from "@/lib/actions";
import { sendEmail } from "@/lib/email";
import { SITE_URL } from "@/lib/site";

import { SEGMENT_VALUES } from "./segments";

const BroadcastSchema = z.object({
  segment: z.enum(SEGMENT_VALUES),
  planSlug: optionalText,
  title: z.string().trim().min(3, "Donnez un titre.").max(160),
  body: z.string().trim().max(2000).optional(),
  href: optionalText,
  alsoEmail: checkbox,
});

/**
 * Sends one notification to a segment.
 *
 * Suspended accounts are excluded from every segment. They cannot sign in, so an
 * in-app notification is unreachable and an e-mail to them is a message from a
 * product they have been locked out of.
 */
export async function broadcast(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const staff = await requirePermission("notifications:write");
  const parsed = parseForm(BroadcastSchema, formData);
  if (!parsed.ok) return parsed.state;

  const active = sql`${userTable.banned} is not true`;
  let where = active;

  switch (parsed.data.segment) {
    case "clients":
      where = and(active, eq(userTable.role, "user"))!;
      break;
    case "equipe":
      where = and(active, inArray(userTable.role, ["admin", "staff"]))!;
      break;
    case "nouveaux": {
      const since = new Date(Date.now() - 30 * 86_400_000);
      where = and(active, gte(userTable.createdAt, since))!;
      break;
    }
    case "plan":
      if (!parsed.data.planSlug) return fail("Choisissez une offre.");
      break;
  }

  const rows =
    parsed.data.segment === "plan"
      ? // Distinct: a customer can hold several services of one offer, and
        // only a live service counts — a cancelled one is a former customer.
        await db
          .selectDistinct({ id: userTable.id, email: userTable.email, name: userTable.name })
          .from(userTable)
          .innerJoin(subscriptions, eq(subscriptions.userId, userTable.id))
          .where(
            and(
              active,
              eq(subscriptions.planSlug, parsed.data.planSlug!),
              inArray(subscriptions.status, ["active", "provisioning"]),
            ),
          )
      : await db
          .select({ id: userTable.id, email: userTable.email, name: userTable.name })
          .from(userTable)
          .where(where);

  if (rows.length === 0) return fail("Aucun destinataire dans ce segment.");

  await notifyMany(
    rows.map((r) => r.id),
    {
      title: parsed.data.title,
      body: parsed.data.body,
      href: parsed.data.href ?? "/dashboard/notifications",
    },
  );

  if (parsed.data.alsoEmail) {
    // Sequential on purpose: Resend rate-limits, and a broadcast is not
    // latency-sensitive. `Promise.all` over a few hundred addresses is how you
    // get half of them silently dropped.
    for (const recipient of rows) {
      await sendEmail({
        to: recipient.email,
        subject: parsed.data.title,
        text: parsed.data.body ?? parsed.data.title,
        action: {
          label: "Ouvrir mon espace",
          url: `${SITE_URL}${parsed.data.href ?? "/dashboard"}`,
        },
      });
    }
  }

  await logActivity({
    actorId: staff.id,
    action: "notification.broadcast",
    meta: {
      segment: parsed.data.segment,
      recipients: rows.length,
      title: parsed.data.title,
      email: parsed.data.alsoEmail,
    },
  });

  revalidatePath("/admin/notifications", "layout");
  return succeed(
    `Envoyé à ${rows.length} destinataire${rows.length > 1 ? "s" : ""}${parsed.data.alsoEmail ? " (notification + e-mail)" : ""}.`,
  );
}
