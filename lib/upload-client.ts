/**
 * The browser side of `/api/uploads`: presign → PUT to the bucket → record.
 *
 * A plain function rather than logic inside `FileUpload`, because three
 * surfaces need it with different chrome — the file button, the thread's chat
 * composer (which attaches to the message it just sent), and the company
 * logo/signature pickers in the settings.
 *
 * Exactly one target per file; the union makes two unrepresentable, and the
 * route refuses two anyway.
 */
export type UploadTarget =
  | { requestId: number }
  | { messageId: number }
  | { demoId: number }
  | { demoRunId: number }
  | { company: true }
  | Record<string, never>;

export type UploadResult =
  | { ok: true; id: number; key: string }
  | { ok: false; error: string };

const ERRORS: Record<string, string> = {
  unsupported_type: "Ce type de fichier n'est pas accepté.",
  storage_not_configured: "Le stockage de fichiers n'est pas encore configuré.",
  forbidden: "Vous ne pouvez pas joindre de fichier ici.",
  quota_exceeded: "Votre espace de stockage est plein.",
};

export async function uploadFile(
  file: File,
  target: UploadTarget = {},
  options: { internal?: boolean; onStep?: (label: string) => void } = {},
): Promise<UploadResult> {
  const step = options.onStep ?? (() => {});
  try {
    step("Préparation…");
    const meta = {
      filename: file.name,
      // Chrome leaves `type` empty for extensions it doesn't know (`.md` on
      // some systems); the server allowlist then rejects it with a clear
      // message rather than this guessing a type.
      contentType: file.type || guessType(file.name),
      size: file.size,
      ...target,
    };

    const presign = await fetch("/api/uploads", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(meta),
    });
    if (!presign.ok) {
      const { error } = await presign.json().catch(() => ({ error: "" }));
      return { ok: false, error: ERRORS[error] ?? "Impossible de préparer l'envoi." };
    }
    const { key, url } = (await presign.json()) as { key: string; url: string };

    step("Envoi…");
    const put = await fetch(url, {
      method: "PUT",
      headers: { "content-type": meta.contentType },
      body: file,
    });
    if (!put.ok) return { ok: false, error: "L'envoi du fichier a échoué. Réessayez." };

    step("Enregistrement…");
    const record = await fetch("/api/uploads", {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ ...meta, key, internal: options.internal ?? false }),
    });
    if (!record.ok) {
      const { error } = await record.json().catch(() => ({ error: "" }));
      return {
        ok: false,
        error: ERRORS[error] ?? "Le fichier a été envoyé mais n'a pas pu être rattaché.",
      };
    }
    const { id } = (await record.json()) as { id: number };
    return { ok: true, id, key };
  } catch {
    return { ok: false, error: "Envoi interrompu. Vérifiez votre connexion." };
  }
}

/** Only for types some browsers leave blank. Anything else stays unknown and
 *  is refused by the server's allowlist. */
function guessType(name: string): string {
  const ext = name.split(".").pop()?.toLowerCase();
  if (ext === "md" || ext === "markdown") return "text/markdown";
  if (ext === "csv") return "text/csv";
  return "application/octet-stream";
}
