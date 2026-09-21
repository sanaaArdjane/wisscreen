import { z } from "zod";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { attachments, demoRuns, demos, requestMessages, requests } from "@/lib/db/schema";
import { getCurrentUser } from "@/lib/guard";
import { can } from "@/lib/permissions";
import {
  MAX_UPLOAD_BYTES,
  buildKey,
  isAllowedContentType,
  presignDownload,
  presignUpload,
  deleteObject,
  storageConfigured,
} from "@/lib/storage";
import { logActivity } from "@/lib/account";
import { consume } from "@/lib/quotas";
import { getEntitledDemo } from "@/lib/server/demos";

/**
 * Uploads and downloads for dashboard attachments.
 *
 * Bytes never pass through the app: `POST` mints a presigned PUT the browser
 * uploads to directly, and `PUT` records the row once that succeeded. A server
 * action would have meant raising `serverActions.bodySizeLimit` to 25 MB and
 * streaming every file through the Node process for no benefit.
 *
 * Why a route and not an action: the browser needs a URL it can `fetch` before
 * it has anything to submit, and the second step has to be callable after an
 * upload that may take a minute.
 *
 * Both steps re-check the caller. The presign step is the one that matters —
 * handing out a signed PUT is handing out write access to the bucket, so the
 * content type is checked against an allowlist, the size against a cap, and the
 * key is always built under `u/<the caller's own id>/`. A client cannot name
 * the key, so nobody can overwrite somebody else's object.
 *
 * **A file has at most one target**, and each target has its own rule for who
 * may attach and who may read:
 *
 * | target      | attach                          | read                               |
 * | request     | its client, or `requests:write` | its client (not internal), or `requests:read` |
 * | message     | same as its request             | same as its request                |
 * | demo        | `demos:write`                   | anyone entitled to it, or `demos:read` |
 * | demoRun     | its customer, or `demos:write`  | its customer (not internal), or `demos:read` |
 * | company     | `settings:write`                | `settings:read` (the PDF reads it server-side) |
 *
 * The demo row is why the GET cannot decide on `ownerId` alone: an instructions
 * PDF is owned by the admin who wrote it, and the customer it was written for
 * would otherwise be refused it.
 */

const Target = {
  requestId: z.number().int().positive().optional(),
  messageId: z.number().int().positive().optional(),
  demoId: z.number().int().positive().optional(),
  demoRunId: z.number().int().positive().optional(),
  /** The company logo or signature used on documents (see /admin/parametres). */
  company: z.boolean().optional(),
};

const PresignSchema = z.object({
  filename: z.string().trim().min(1).max(255),
  contentType: z.string().trim().min(1).max(255),
  size: z.number().int().positive().max(MAX_UPLOAD_BYTES),
  ...Target,
});

const RecordSchema = PresignSchema.extend({
  key: z.string().trim().min(1).max(512),
  internal: z.boolean().optional(),
});

type Caller = NonNullable<Awaited<ReturnType<typeof getCurrentUser>>>;
type TargetInput = z.infer<typeof PresignSchema>;

type Resolved = {
  ownerId: string;
  requestId?: number;
  messageId?: number;
  demoId?: number;
  demoRunId?: number;
  /** Whether the caller is acting as the desk on this target — decides whether
   *  `internal` is honoured and whether a storage quota is spent. */
  asStaff: boolean;
};

/** Where the file goes, and whose it is — or null if the caller may not. */
async function resolveTarget(user: Caller, input: TargetInput): Promise<Resolved | null | "ambiguous"> {
  const set = [input.requestId, input.messageId, input.demoId, input.demoRunId, input.company].filter(
    Boolean,
  );
  if (set.length > 1) return "ambiguous";

  if (input.messageId) {
    const [msg] = await db
      .select({ requestId: requestMessages.requestId })
      .from(requestMessages)
      .where(eq(requestMessages.id, input.messageId))
      .limit(1);
    if (!msg) return null;
    const req = await mayAttachTo(user, msg.requestId);
    if (!req) return null;
    return {
      ownerId: req.userId,
      requestId: req.id,
      messageId: input.messageId,
      asStaff: can(user, "requests:write"),
    };
  }

  if (input.requestId) {
    const req = await mayAttachTo(user, input.requestId);
    if (!req) return null;
    // A staff upload belongs to the client whose request it is, so it shows up
    // in their /dashboard/documents rather than in the uploader's.
    return { ownerId: req.userId, requestId: req.id, asStaff: can(user, "requests:write") };
  }

  if (input.demoId) {
    if (!can(user, "demos:write")) return null;
    const [demo] = await db.select({ id: demos.id }).from(demos).where(eq(demos.id, input.demoId)).limit(1);
    // Owned by its author on purpose: `/dashboard/documents` lists by owner, and
    // an instructions PDF shared with fifty customers is not fifty of theirs.
    return demo ? { ownerId: user.id, demoId: demo.id, asStaff: true } : null;
  }

  if (input.demoRunId) {
    const [run] = await db.select().from(demoRuns).where(eq(demoRuns.id, input.demoRunId)).limit(1);
    if (!run) return null;
    const staff = can(user, "demos:write");
    if (!staff) {
      if (run.userId !== user.id) return null;
      // A customer only submits into a run that is waiting for them, and only
      // while the demo is still theirs to use.
      if (run.outcome !== "en_attente" && run.outcome !== "en_cours") return null;
      if (!run.demoId || !(await getEntitledDemo(user.id, { id: run.demoId }))) return null;
    }
    return { ownerId: run.userId, demoRunId: run.id, asStaff: staff };
  }

  if (input.company) {
    return can(user, "settings:write") ? { ownerId: user.id, asStaff: true } : null;
  }

  // No target: a personal document in /dashboard/documents.
  return { ownerId: user.id, asStaff: false };
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user || user.banned) return Response.json({ error: "unauthorized" }, { status: 401 });
  if (!storageConfigured()) {
    return Response.json({ error: "storage_not_configured" }, { status: 503 });
  }

  const parsed = PresignSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "invalid_input" }, { status: 400 });
  if (!isAllowedContentType(parsed.data.contentType)) {
    return Response.json({ error: "unsupported_type" }, { status: 415 });
  }
  const target = await resolveTarget(user, parsed.data);
  if (target === "ambiguous") return Response.json({ error: "invalid_input" }, { status: 400 });
  if (!target) return Response.json({ error: "forbidden" }, { status: 403 });

  const key = buildKey(user.id, parsed.data.filename);
  const url = await presignUpload(key, parsed.data.contentType);
  return Response.json({ key, url });
}

/** Step two: the object is in the bucket, record it. */
export async function PUT(request: Request) {
  const user = await getCurrentUser();
  if (!user || user.banned) return Response.json({ error: "unauthorized" }, { status: 401 });

  const parsed = RecordSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "invalid_input" }, { status: 400 });

  // The key must be the caller's own prefix. Without this check a client could
  // record a row pointing at any object in the bucket and then download it
  // through the GET below.
  if (!parsed.data.key.startsWith(`u/${user.id}/`)) {
    return Response.json({ error: "forbidden" }, { status: 403 });
  }

  const target = await resolveTarget(user, parsed.data);
  if (target === "ambiguous") return Response.json({ error: "invalid_input" }, { status: 400 });
  if (!target) return Response.json({ error: "forbidden" }, { status: 403 });

  // A customer's own upload spends their storage allowance, if they have one.
  // (No `storage.mb` row = unlimited, which is every account until a service
  // that grants storage is provisioned.) The quota used to be displayed
  // everywhere and spent nowhere. The desk's uploads onto a customer's record
  // are not the customer's consumption.
  if (!target.asStaff) {
    const spent = await consume(target.ownerId, "storage.mb", Math.max(1, Math.ceil(parsed.data.size / (1024 * 1024))));
    if (!spent.ok) {
      await deleteObject(parsed.data.key).catch(() => {});
      return Response.json({ error: "quota_exceeded" }, { status: 409 });
    }
  }

  const [row] = await db
    .insert(attachments)
    .values({
      key: parsed.data.key,
      filename: parsed.data.filename,
      contentType: parsed.data.contentType,
      sizeBytes: parsed.data.size,
      uploadedById: user.id,
      ownerId: target.ownerId,
      requestId: target.requestId,
      messageId: target.messageId,
      demoId: target.demoId,
      demoRunId: target.demoRunId,
      internal: Boolean(parsed.data.internal) && target.asStaff,
    })
    .returning();

  await logActivity({
    actorId: user.id,
    action: "attachment.uploaded",
    entity: "attachment",
    entityId: row.id,
    meta: {
      filename: row.filename,
      requestId: row.requestId,
      messageId: row.messageId,
      demoId: row.demoId,
      demoRunId: row.demoRunId,
      company: parsed.data.company || undefined,
    },
  });

  return Response.json({ id: row.id, key: row.key });
}

/**
 * A short-lived download link.
 *
 * The bucket is private, so this is the only way to read an object — and it
 * checks the caller every time rather than trusting a URL that was handed out
 * once. The rule depends on what the file is attached to; see the table at the
 * top. A refusal is a 404, never a 403: "that file exists" is itself a leak.
 */
export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user || user.banned) return Response.json({ error: "unauthorized" }, { status: 401 });

  const id = Number(new URL(request.url).searchParams.get("id"));
  if (!Number.isInteger(id)) return Response.json({ error: "invalid_input" }, { status: 400 });

  const [row] = await db.select().from(attachments).where(eq(attachments.id, id)).limit(1);
  if (!row || !(await mayDownload(user, row))) {
    return Response.json({ error: "not_found" }, { status: 404 });
  }

  const inline = new URL(request.url).searchParams.get("inline") === "1";
  return Response.redirect(await presignDownload(row.key, row.filename, inline), 302);
}

async function mayDownload(user: Caller, row: typeof attachments.$inferSelect): Promise<boolean> {
  if (row.demoId) {
    if (can(user, "demos:read")) return true;
    return Boolean(await getEntitledDemo(user.id, { id: row.demoId }));
  }
  if (row.demoRunId) {
    if (can(user, "demos:read")) return true;
    return row.ownerId === user.id && !row.internal;
  }
  if (can(user, "requests:read")) return true;
  // Company assets (logo, signature) have no target and a staff owner.
  if (!row.requestId && !row.messageId && can(user, "settings:read")) return true;
  return row.ownerId === user.id && !row.internal;
}

/** The request a file may be attached to, or null. */
async function mayAttachTo(user: Caller, requestId: number) {
  if (can(user, "requests:write")) {
    const [row] = await db.select().from(requests).where(eq(requests.id, requestId)).limit(1);
    return row ?? null;
  }
  const [row] = await db
    .select()
    .from(requests)
    .where(and(eq(requests.id, requestId), eq(requests.userId, user.id)))
    .limit(1);
  return row ?? null;
}
