"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { lt, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { activityLog } from "@/lib/db/schema";
import { requirePermission } from "@/lib/guard";
import { logActivity } from "@/lib/account";
import { fail, parseForm, succeed, type ActionState } from "@/lib/actions";

const PurgeSchema = z.object({
  before: z
    .string()
    .min(1, "Choisissez une date.")
    .transform((v) => new Date(`${v}T00:00:00`))
    .refine((d) => !Number.isNaN(d.getTime()), "Date invalide."),
});

/**
 * Delete journal entries older than a date. The purge itself is logged *after*
 * it runs, so the journal always says who emptied it and when — a log that can
 * be erased without a trace is not an audit log.
 *
 * The last 30 days are never purgeable from here: a very recent entry is the
 * one most likely to be needed to answer "who did this?".
 */
export async function purgeActivity(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const staff = await requirePermission("activity:delete");
  const parsed = parseForm(PurgeSchema, formData);
  if (!parsed.ok) return parsed.state;

  const floor = new Date(Date.now() - 30 * 24 * 3600 * 1000);
  if (parsed.data.before > floor) return fail("Les 30 derniers jours sont conservés. Choisissez une date plus ancienne.");

  const deleted = await db
    .delete(activityLog)
    .where(lt(activityLog.createdAt, parsed.data.before))
    .returning({ id: sql<number>`${activityLog.id}` });

  await logActivity({
    actorId: staff.id,
    action: "activity.purged",
    meta: { before: parsed.data.before.toISOString().slice(0, 10), deleted: deleted.length },
  });
  revalidatePath("/admin/journal");
  return succeed(`${deleted.length} entrée${deleted.length > 1 ? "s" : ""} supprimée${deleted.length > 1 ? "s" : ""}.`);
}
