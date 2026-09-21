import { and, desc, eq, inArray, isNull, or } from "drizzle-orm";
import { db } from "@/lib/db";
import { attachments, demoAccess, demoRuns, demoSecrets, demos, user } from "@/lib/db/schema";
import { effectiveExpiry, isExpired, parseBlocks, type DemoBlock } from "@/lib/demos";

/**
 * Who may open which demo — the one rule, used by the client pages, the upload
 * route and the secret route alike, so "entitled" means the same thing in all
 * three.
 *
 * Plain module, not `"use server"`, for the reason `lib/server/queries.ts`
 * gives: these take a user id, and as server actions they would let anyone ask
 * about anyone.
 *
 * A demo is open to a customer when it is **published**, **not expired**, and
 * either visible to all clients or granted to them by a `demo_access` row that
 * has not been revoked or run out. The earliest of the demo's expiry and the
 * grant's wins — a grant can shorten access, never extend it past the demo.
 */

export type DemoRow = typeof demos.$inferSelect;
export type GrantRow = typeof demoAccess.$inferSelect;

export type Entitled = {
  demo: DemoRow;
  blocks: DemoBlock[];
  grant: GrantRow | null;
  expiresAt: Date | null;
};

function evaluate(demo: DemoRow, grant: GrantRow | null, now: Date): Entitled | null {
  if (demo.status !== "publie") return null;
  const liveGrant = grant && !grant.revokedAt ? grant : null;
  if (demo.visibility !== "all_clients" && !liveGrant) return null;
  const expiresAt = effectiveExpiry(demo.expiresAt, liveGrant?.expiresAt);
  if (isExpired(expiresAt, now)) return null;
  return { demo, blocks: parseBlocks(demo.blocks), grant: liveGrant, expiresAt };
}

/** Every demo a customer can open, newest first. */
export async function listEntitledDemos(userId: string, now = new Date()): Promise<Entitled[]> {
  const rows = await db
    .select({ demo: demos, grant: demoAccess })
    .from(demos)
    .leftJoin(demoAccess, and(eq(demoAccess.demoId, demos.id), eq(demoAccess.userId, userId)))
    .where(
      and(
        eq(demos.status, "publie"),
        or(eq(demos.visibility, "all_clients"), isNull(demoAccess.revokedAt)),
      ),
    )
    .orderBy(desc(demos.updatedAt));
  return rows.map((r) => evaluate(r.demo, r.grant, now)).filter((e): e is Entitled => e !== null);
}

export async function getEntitledDemo(
  userId: string,
  where: { slug: string } | { id: number },
  now = new Date(),
): Promise<Entitled | null> {
  const [row] = await db
    .select({ demo: demos, grant: demoAccess })
    .from(demos)
    .leftJoin(demoAccess, and(eq(demoAccess.demoId, demos.id), eq(demoAccess.userId, userId)))
    .where("slug" in where ? eq(demos.slug, where.slug) : eq(demos.id, where.id))
    .limit(1);
  return row ? evaluate(row.demo, row.grant, now) : null;
}

/** The labels of secrets actually stored for a demo — never the ciphertext. */
export async function listSecretLabels(demoId: number) {
  return db
    .select({
      blockId: demoSecrets.blockId,
      label: demoSecrets.label,
      revealCount: demoSecrets.revealCount,
      updatedAt: demoSecrets.updatedAt,
    })
    .from(demoSecrets)
    .where(eq(demoSecrets.demoId, demoId));
}

/** Files authored on the demo itself (instructions PDFs and the like). */
export async function listDemoFiles(demoId: number) {
  return db
    .select({
      id: attachments.id,
      filename: attachments.filename,
      sizeBytes: attachments.sizeBytes,
      contentType: attachments.contentType,
      createdAt: attachments.createdAt,
    })
    .from(attachments)
    .where(eq(attachments.demoId, demoId))
    .orderBy(desc(attachments.createdAt));
}

/** A customer's runs of one demo, with the files exchanged on each. */
export async function listRunsForUser(userId: string, demoId: number) {
  const runs = await db
    .select()
    .from(demoRuns)
    .where(and(eq(demoRuns.userId, userId), eq(demoRuns.demoId, demoId)))
    .orderBy(desc(demoRuns.createdAt));
  return attachFiles(runs, false);
}

/** The desk's view of a demo's runs, all customers. */
export async function listRunsForDemo(demoId: number) {
  const runs = await db
    .select({ run: demoRuns, client: { id: user.id, name: user.name, email: user.email } })
    .from(demoRuns)
    .innerJoin(user, eq(user.id, demoRuns.userId))
    .where(eq(demoRuns.demoId, demoId))
    .orderBy(desc(demoRuns.createdAt));
  const withFiles = await attachFiles(
    runs.map((r) => r.run),
    true,
  );
  return withFiles.map((r, i) => ({ ...r, client: runs[i].client }));
}

async function attachFiles<R extends { id: number; userId: string }>(runs: R[], includeInternal: boolean) {
  if (runs.length === 0) return [];
  const files = await db
    .select()
    .from(attachments)
    .where(
      and(
        inArray(
          attachments.demoRunId,
          runs.map((r) => r.id),
        ),
        includeInternal ? undefined : eq(attachments.internal, false),
      ),
    )
    .orderBy(attachments.createdAt);
  return runs.map((run) => {
    const mine = files.filter((f) => f.demoRunId === run.id);
    return {
      ...run,
      // Who uploaded it is what separates the customer's submission from the
      // desk's deliverable — see the comment on `attachments.demoRunId`.
      submitted: mine.filter((f) => f.uploadedById === run.userId),
      delivered: mine.filter((f) => f.uploadedById !== run.userId),
    };
  });
}
