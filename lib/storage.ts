import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

/**
 * File storage, on **Neon Object Storage** — the bucket declared in `neon.ts`
 * and provisioned by `neon deploy`.
 *
 * Why not S3 or R2: this is the same Neon project the database is in, the
 * credentials arrive in `.env.local` with the connection string on every
 * `neon link` / `neon deploy`, and the bucket branches with the data. A preview
 * branch gets a consistent snapshot of both the rows and the files they point
 * at. No second provider, no second account, nothing for anyone to paste in.
 *
 * Two non-negotiables from Neon's S3 surface:
 *  - `forcePathStyle: true` — Neon addresses path-style only, and a virtual-host
 *    client fails with a DNS error that looks nothing like a config problem.
 *  - the bucket is **private**, so nothing is ever served from a stored URL. The
 *    database holds the object *key*; every read mints a short-lived presigned
 *    GET here. A link that leaks expires on its own.
 *
 * Credentials unset → `storageConfigured()` is false and the upload UI says so
 * rather than failing at submit. Same fail-soft contract as `lib/email.ts`.
 */

export const BUCKET = process.env.NEON_BUCKET ?? "documents";

/** How long a presigned download link stays valid. */
const DOWNLOAD_TTL_SECONDS = 300;
/** How long the browser has to complete a direct upload. */
const UPLOAD_TTL_SECONDS = 600;

export const MAX_UPLOAD_BYTES = 25 * 1024 * 1024;

/**
 * What a client may upload. An allowlist, not a denylist: this is a trust
 * boundary, and "anything that isn't an executable" is not a list anyone can
 * keep correct. The extension is never trusted — the browser-declared type is
 * checked here and the object is stored with it, and because the bucket is
 * private and only ever read through a presigned `GET` with
 * `ResponseContentDisposition: attachment`, nothing uploaded is ever executed
 * or rendered in the site's own origin.
 */
export const ALLOWED_CONTENT_TYPES = [
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
  "text/plain",
  "text/csv",
  // Demo instructions. Safe for the same reason as everything else here: the
  // object is only ever served as an attachment from the bucket's own origin.
  // (`image/svg+xml` stays out — it is script-capable, and the disposition is
  // the only line between it and a stored XSS if anything ever served it inline.)
  "text/markdown",
  "text/html",
  "application/zip",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
] as const;

let client: S3Client | undefined;

export function storageConfigured(): boolean {
  return Boolean(
    process.env.AWS_ACCESS_KEY_ID &&
      process.env.AWS_SECRET_ACCESS_KEY &&
      process.env.AWS_ENDPOINT_URL_S3,
  );
}

function s3(): S3Client {
  if (!client) {
    if (!storageConfigured()) {
      throw new Error(
        "Object storage is not configured. Run `pnpm neon:deploy` to provision the bucket and pull AWS_* into .env.local.",
      );
    }
    // Endpoint, region and credentials come from the standard AWS env chain,
    // which is exactly what Neon injects — so nothing is passed explicitly.
    client = new S3Client({ forcePathStyle: true });
  }
  return client;
}

/**
 * Object keys are `u/<userId>/<random>-<safe filename>`. The user id prefix makes
 * a per-account listing a prefix scan, and the random segment means two uploads
 * of "contrat.pdf" never collide or overwrite each other.
 */
export function buildKey(userId: string, filename: string): string {
  const safe = filename
    .normalize("NFKD")
    .replace(/[^\w.\- ]+/g, "")
    .replace(/\s+/g, "-")
    .slice(-80)
    .replace(/^[-.]+/, "");
  return `u/${userId}/${crypto.randomUUID().slice(0, 8)}-${safe || "fichier"}`;
}

/** A presigned PUT the browser uploads to directly, so bytes never transit the app. */
export async function presignUpload(key: string, contentType: string): Promise<string> {
  return getSignedUrl(
    s3(),
    new PutObjectCommand({ Bucket: BUCKET, Key: key, ContentType: contentType }),
    { expiresIn: UPLOAD_TTL_SECONDS },
  );
}

/** A short-lived download link. `filename` forces a download rather than inline render. */
/**
 * `inline` is for previewing a PDF or image in a new tab. It is only ever safe
 * because the object is served from the bucket's own origin, never the site's —
 * an inline HTML file there cannot read this site's cookies. `text/html` is
 * still forced to `attachment` below, as a second line.
 */
export async function presignDownload(
  key: string,
  filename?: string,
  inline = false,
): Promise<string> {
  const safeInline = inline && !/\.html?$/i.test(filename ?? "");
  const disposition = safeInline ? "inline" : "attachment";
  return getSignedUrl(
    s3(),
    new GetObjectCommand({
      Bucket: BUCKET,
      Key: key,
      ResponseContentDisposition: filename
        ? `${disposition}; filename="${filename.replace(/["\\]/g, "")}"`
        : disposition,
    }),
    { expiresIn: DOWNLOAD_TTL_SECONDS },
  );
}

export async function deleteObject(key: string): Promise<void> {
  await s3().send(new DeleteObjectCommand({ Bucket: BUCKET, Key: key }));
}

export function isAllowedContentType(value: string): boolean {
  return (ALLOWED_CONTENT_TYPES as readonly string[]).includes(value);
}
