import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

/**
 * Encryption at rest for the few values that must never sit in a column in the
 * clear: demo passwords, SSH keys, sandbox credentials.
 *
 * AES-256-GCM with a random 12-byte IV per value. The output is
 * `v1:<iv>:<tag>:<ciphertext>`, all base64url — the `v1` is the rotation seam:
 * a second key is an `if` on the prefix, never a migration.
 *
 * **`aad` binds a ciphertext to the row it belongs to.** Callers pass something
 * like `demoId:blockId:label`; a ciphertext copied into another row then fails
 * authentication instead of quietly decrypting as that row's secret.
 *
 * **Unlike every other optional dependency here, this one does not degrade to
 * a lesser version of the feature.** E-mail unset logs the message; storage
 * unset disables the button. The equivalent here would be storing plaintext,
 * which is not "degraded", it is worse. So with `ENCRYPTION_KEY` unset,
 * `encryptSecret` throws and the UI refuses to accept secrets at all, while
 * every other block kind keeps working. `/admin/parametres` shows the state.
 *
 * Losing the key loses every secret encrypted under it. That is the property,
 * not a bug — store the key where the database backups are not.
 */

const VERSION = "v1";

export function encryptionConfigured(): boolean {
  try {
    key();
    return true;
  } catch {
    return false;
  }
}

function key(): Buffer {
  const raw = process.env.ENCRYPTION_KEY;
  if (!raw) throw new Error("ENCRYPTION_KEY is not set. Generate one with: openssl rand -base64 32");
  const buf = Buffer.from(raw, "base64");
  if (buf.length !== 32) {
    throw new Error(
      "ENCRYPTION_KEY must be 32 bytes, base64-encoded. Generate one with: openssl rand -base64 32",
    );
  }
  return buf;
}

export function encryptSecret(plain: string, aad: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key(), iv);
  cipher.setAAD(Buffer.from(aad, "utf8"));
  const ct = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [VERSION, iv.toString("base64url"), tag.toString("base64url"), ct.toString("base64url")].join(":");
}

export function decryptSecret(blob: string, aad: string): string {
  const [version, iv, tag, ct] = blob.split(":");
  if (version !== VERSION || !iv || !tag || ct === undefined) {
    throw new Error("Unrecognised secret format.");
  }
  const decipher = createDecipheriv("aes-256-gcm", key(), Buffer.from(iv, "base64url"));
  decipher.setAAD(Buffer.from(aad, "utf8"));
  decipher.setAuthTag(Buffer.from(tag, "base64url"));
  return Buffer.concat([decipher.update(Buffer.from(ct, "base64url")), decipher.final()]).toString(
    "utf8",
  );
}

/** The AAD for a demo secret. One definition, so the writer and the reader can't drift. */
export function demoSecretAad(demoId: number, blockId: string, label: string): string {
  return `demo:${demoId}:${blockId}:${label}`;
}
