"use server";

import { revalidatePath } from "next/cache";
import { and, eq, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { attachments, demoAccess, demoRuns } from "@/lib/db/schema";
import { requireUser } from "@/lib/guard";
import { logActivity, notifyStaff } from "@/lib/account";
import { consume } from "@/lib/quotas";
import { getEntitledDemo } from "@/lib/server/demos";

/**
 * The customer's side of an `upload` block: open a run, drop files into it,
 * send it for processing.
 *
 * Every action re-derives entitlement from `getEntitledDemo` — a demo that was
 * revoked or expired a minute ago must stop accepting files now, not at the
 * next page load.
 */

export async function startDemoRun(formData: FormData): Promise<void> {
  const user = await requireUser();
  const demoId = Number(formData.get("demoId"));
  if (!Number.isInteger(demoId)) return;

  const entitled = await getEntitledDemo(user.id, { id: demoId });
  if (!entitled || !entitled.blocks.some((b) => b.kind === "upload")) return;

  // One open run at a time: a second "Commencer" reuses the first.
  const [open] = await db
    .select({ id: demoRuns.id })
    .from(demoRuns)
    .where(
      and(
        eq(demoRuns.userId, user.id),
        eq(demoRuns.demoId, demoId),
        sql`${demoRuns.outcome} in ('en_attente', 'en_cours')`,
      ),
    )
    .limit(1);
  if (open) return;

  // Processing is the part of a demo that costs real work, so it is the one
  // hook left for a quota. No service grants `demo.processing` today, and a
  // metric with no row is unlimited — so this is a no-op until one does,
  // at which point it becomes a limit without a code change.
  const quota = await consume(user.id, "demo.processing");
  if (!quota.ok) {
    await db.insert(demoRuns).values({
      userId: user.id,
      demoId,
      serviceSlug: entitled.demo.serviceSlug ?? entitled.demo.slug,
      demoAccessId: entitled.grant?.id,
      outcome: "quota",
    });
    revalidatePath(`/dashboard/demos/${entitled.demo.slug}`);
    return;
  }

  const [run] = await db
    .insert(demoRuns)
    .values({
      userId: user.id,
      demoId,
      serviceSlug: entitled.demo.serviceSlug ?? entitled.demo.slug,
      demoAccessId: entitled.grant?.id,
      outcome: "en_attente",
    })
    .returning({ id: demoRuns.id });

  if (entitled.grant) {
    await db.update(demoAccess).set({ lastAccessAt: new Date() }).where(eq(demoAccess.id, entitled.grant.id));
  }
  await logActivity({
    actorId: user.id,
    action: "demo.run_started",
    entity: "demo_run",
    entityId: run.id,
    meta: { demoId },
  });
  revalidatePath(`/dashboard/demos/${entitled.demo.slug}`);
}

/** "Envoyer pour traitement": the files are in, tell the desk. */
export async function submitDemoRun(formData: FormData): Promise<void> {
  const user = await requireUser();
  const runId = Number(formData.get("runId"));
  if (!Number.isInteger(runId)) return;

  const [run] = await db
    .select()
    .from(demoRuns)
    .where(and(eq(demoRuns.id, runId), eq(demoRuns.userId, user.id), eq(demoRuns.outcome, "en_attente")))
    .limit(1);
  if (!run?.demoId) return;
  const entitled = await getEntitledDemo(user.id, { id: run.demoId });
  if (!entitled) return;

  const [{ n }] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(attachments)
    .where(eq(attachments.demoRunId, runId));
  if (n === 0) return;

  await db
    .update(demoRuns)
    .set({ outcome: "en_cours", input: `${n} fichier${n > 1 ? "s" : ""}`, updatedAt: new Date() })
    .where(eq(demoRuns.id, runId));

  await notifyStaff("demos:read", {
    type: "demo",
    title: `Fichier à traiter — ${entitled.demo.title}`,
    body: `${user.name} a envoyé ${n} fichier${n > 1 ? "s" : ""}.`,
    href: `/admin/demos/${run.demoId}#execution-${runId}`,
    actorId: user.id,
    entity: "demo",
    entityId: run.demoId,
  });
  await logActivity({
    actorId: user.id,
    action: "demo.run_submitted",
    entity: "demo_run",
    entityId: runId,
    meta: { files: n },
  });
  revalidatePath(`/dashboard/demos/${entitled.demo.slug}`);
}
