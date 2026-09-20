import { z } from "zod";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { attachments, requests } from "@/lib/db/schema";
import { getCurrentUser } from "@/lib/guard";
import { can } from "@/lib/permissions";
import {
  MAX_UPLOAD_BYTES,
  buildKey,
  isAllowedContentType,
  presignDownload,
  presignUpload,
  storageConfigured,
} from "@/lib/storage";
import { logActivity } from "@/lib/account";

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
 */

const PresignSchema = z.object({
  filename: z.string().trim().min(1).max(255),
  contentType: z.string().trim().min(1).max(255),
  size: z.number().int().positive().max(MAX_UPLOAD_BYTES),
  requestId: z.number().int().positive().optional(),
});

const RecordSchema = PresignSchema.extend({
  key: z.string().trim().min(1).max(512),
  internal: z.boolean().optional(),
});

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
  if (parsed.data.requestId && !(await mayAttachTo(user, parsed.data.requestId))) {
    return Response.json({ error: "forbidden" }, { status: 403 });
  }

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

  let ownerId = user.id;
  if (parsed.data.requestId) {
    const target = await mayAttachTo(user, parsed.data.requestId);
    if (!target) return Response.json({ error: "forbidden" }, { status: 403 });
    // A staff upload belongs to the client whose request it is, so it shows up
    // in their /dashboard/documents rather than in the uploader's.
    ownerId = target.userId;
  }

  const [row] = await db
    .insert(attachments)
    .values({
      key: parsed.data.key,
      filename: parsed.data.filename,
      contentType: parsed.data.contentType,
      sizeBytes: parsed.data.size,
      uploadedById: user.id,
      ownerId,
      requestId: parsed.data.requestId,
      internal: Boolean(parsed.data.internal) && can(user, "requests:write"),
    })
    .returning();

  await logActivity({
    actorId: user.id,
    action: "attachment.uploaded",
    entity: "attachment",
    entityId: row.id,
    meta: { filename: row.filename, requestId: row.requestId },
  });

  return Response.json({ id: row.id });
}

/**
 * A short-lived download link.
 *
 * The bucket is private, so this is the only way to read an object — and it
 * checks ownership every time rather than trusting a URL that was handed out
 * once. Staff with `requests:read` can fetch any attachment; everyone else only
 * their own, and only the ones not marked internal.
 */
export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user || user.banned) return Response.json({ error: "unauthorized" }, { status: 401 });

  const id = Number(new URL(request.url).searchParams.get("id"));
  if (!Number.isInteger(id)) return Response.json({ error: "invalid_input" }, { status: 400 });

  const [row] = await db.select().from(attachments).where(eq(attachments.id, id)).limit(1);
  if (!row) return Response.json({ error: "not_found" }, { status: 404 });

  const isStaff = can(user, "requests:read");
  const isOwner = row.ownerId === user.id && !row.internal;
  if (!isStaff && !isOwner) return Response.json({ error: "not_found" }, { status: 404 });

  return Response.redirect(await presignDownload(row.key, row.filename), 302);
}

/** The request a file may be attached to, or null. */
async function mayAttachTo(
  user: { id: string; role?: string | null; permissions?: Record<string, boolean> | null },
  requestId: number,
) {
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
