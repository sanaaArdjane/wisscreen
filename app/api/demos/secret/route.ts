import { z } from "zod";
import { and, eq, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { demoAccess, demoSecrets, demos } from "@/lib/db/schema";
import { getCurrentUser } from "@/lib/guard";
import { can } from "@/lib/permissions";
import { decryptSecret, demoSecretAad, encryptionConfigured } from "@/lib/crypto";
import { declaredSecrets, effectiveExpiry, isExpired, parseBlocks } from "@/lib/demos";
import { getEntitledDemo } from "@/lib/server/demos";
import { logActivity } from "@/lib/account";

/**
 * Reveal one demo secret — a test password, an SSH key — to someone allowed to
 * see it, and write down that they did.
 *
 * A route rather than a server action: it returns a value to already-hydrated
 * JS and needs its own `Cache-Control: no-store`. The page that rendered the
 * "Afficher" button proved nothing; every condition is re-checked here from
 * scratch — session, ban, publication, entitlement, the grant's and the
 * block's expiry, and that the block still declares this secret at all.
 *
 * Staff with `demos:read` can reveal any secret, which is how the desk checks
 * what it sent. Their reveals are logged too.
 */

const Schema = z.object({
  demoId: z.number().int().positive(),
  blockId: z.string().min(1).max(64),
  label: z.string().min(1).max(80),
});

const NO_STORE = { "Cache-Control": "no-store" };

export async function POST(request: Request): Promise<Response> {
  const user = await getCurrentUser();
  if (!user || user.banned) return Response.json({ error: "unauthorized" }, { status: 401, headers: NO_STORE });
  if (!encryptionConfigured()) {
    return Response.json({ error: "not_configured" }, { status: 503, headers: NO_STORE });
  }

  const parsed = Schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "invalid_input" }, { status: 400, headers: NO_STORE });
  const { demoId, blockId, label } = parsed.data;

  const asStaff = can(user, "demos:read");
  const entitled = await getEntitledDemo(user.id, { id: demoId });
  // Refusals are 404: "this demo has a secret called X" is itself information.
  if (!entitled && !asStaff) return Response.json({ error: "not_found" }, { status: 404, headers: NO_STORE });

  let blocks = entitled?.blocks;
  if (!blocks) {
    // Staff, looking at a demo that isn't published or isn't theirs.
    const [row] = await db.select({ blocks: demos.blocks }).from(demos).where(eq(demos.id, demoId)).limit(1);
    if (!row) return Response.json({ error: "not_found" }, { status: 404, headers: NO_STORE });
    blocks = parseBlocks(row.blocks);
  }

  if (!declaredSecrets(blocks).some((s) => s.blockId === blockId && s.label === label)) {
    return Response.json({ error: "not_found" }, { status: 404, headers: NO_STORE });
  }

  if (!asStaff) {
    const block = blocks.find((b) => b.id === blockId);
    const blockExpiry = block && "expiresAt" in block ? block.expiresAt : undefined;
    if (isExpired(effectiveExpiry(entitled?.expiresAt, blockExpiry), new Date())) {
      return Response.json({ error: "expired" }, { status: 410, headers: NO_STORE });
    }
  }

  const [secret] = await db
    .select()
    .from(demoSecrets)
    .where(
      and(eq(demoSecrets.demoId, demoId), eq(demoSecrets.blockId, blockId), eq(demoSecrets.label, label)),
    )
    .limit(1);
  if (!secret) return Response.json({ error: "not_set" }, { status: 404, headers: NO_STORE });

  let value: string;
  try {
    value = decryptSecret(secret.ciphertext, demoSecretAad(demoId, blockId, label));
  } catch {
    // Wrong key, or a ciphertext that was moved to another row. Either way the
    // honest answer is that this secret cannot be read, not a stack trace.
    return Response.json({ error: "undecryptable" }, { status: 500, headers: NO_STORE });
  }

  await db
    .update(demoSecrets)
    .set({ revealCount: sql`${demoSecrets.revealCount} + 1` })
    .where(eq(demoSecrets.id, secret.id));
  if (entitled?.grant) {
    await db.update(demoAccess).set({ lastAccessAt: new Date() }).where(eq(demoAccess.id, entitled.grant.id));
  }
  await logActivity({
    actorId: user.id,
    action: "demo.secret_revealed",
    entity: "demo",
    entityId: demoId,
    meta: { blockId, label, asStaff },
  });

  return Response.json({ value }, { headers: NO_STORE });
}
