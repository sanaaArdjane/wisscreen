import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { attachments } from "@/lib/db/schema";
import { SITE_CONTENT_TYPES, getObjectStream, storageConfigured } from "@/lib/storage";

/**
 * `/media/<id>` — the public-site assets the owner uploads from /admin/site (hero
 * images, section videos, solution covers).
 *
 * The bucket stays private: this streams the object through the app, and only for a
 * row flagged `public` (which only the `site` upload target sets, behind
 * `site:write`) whose type is an image or a video. Every other attachment is a 404
 * here, exactly as if it did not exist, and stays behind `/api/uploads`' checks.
 *
 * - **Immutable caching.** An id never points at different bytes (a replaced image is
 *   a new upload, a new id), so browsers and CDNs may keep it for a year.
 * - **Ranges pass through.** Browsers seek video with `Range` requests (Safari won't
 *   even start playback without a 206), so the header goes straight to the bucket and
 *   its `Content-Range` comes straight back.
 * - It is a *local* path to `next/image`, so images get resized and re-encoded per
 *   breakpoint by the optimizer like anything under `public/`.
 */
export async function GET(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id: raw } = await ctx.params;
  const id = Number(raw);
  if (!Number.isInteger(id) || id <= 0 || !storageConfigured()) return notFound();

  const [row] = await db
    .select({ key: attachments.key, contentType: attachments.contentType, filename: attachments.filename })
    .from(attachments)
    .where(and(eq(attachments.id, id), eq(attachments.public, true)))
    .limit(1)
    .catch(() => []);
  if (!row || !(SITE_CONTENT_TYPES as readonly string[]).includes(row.contentType)) return notFound();

  const range = request.headers.get("range");
  try {
    const object = await getObjectStream(row.key, range);
    const headers = new Headers({
      "Content-Type": row.contentType,
      "Cache-Control": "public, max-age=31536000, immutable",
      "Accept-Ranges": "bytes",
      "X-Content-Type-Options": "nosniff",
      "Content-Disposition": `inline; filename="${row.filename.replace(/["\\]/g, "")}"`,
    });
    if (object.contentLength !== undefined) headers.set("Content-Length", String(object.contentLength));
    if (object.contentRange) headers.set("Content-Range", object.contentRange);
    return new Response(object.body, { status: object.partial ? 206 : 200, headers });
  } catch (error) {
    // An unsatisfiable range is the client's mistake, not a missing file.
    if ((error as { name?: string }).name === "InvalidRange") {
      return new Response(null, { status: 416 });
    }
    return notFound();
  }
}

function notFound() {
  return new Response("Not found", { status: 404, headers: { "Cache-Control": "no-store" } });
}
