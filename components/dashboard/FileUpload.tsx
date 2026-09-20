"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { Button, Spinner } from "@heroui/react";
import { Icon } from "@/components/ui/Icon";
import { formatBytes } from "@/lib/format";

/**
 * Direct-to-bucket upload: presign → PUT the file to storage → record the row.
 *
 * The middle step goes straight from the browser to Neon Object Storage, so a
 * 25 MB attachment never occupies the Node process. `router.refresh()` at the
 * end re-renders the server component that lists the files, which is why this
 * component holds no list of its own — there is one source of truth for what is
 * attached, and it is the database.
 *
 * Failure is reported, never swallowed: an upload that silently does nothing is
 * the worst version of this control, so each of the three steps has its own
 * message.
 */
export function FileUpload({
  requestId,
  internal = false,
  disabled = false,
  disabledReason,
  label = "Joindre un fichier",
  accept,
  maxBytes,
}: {
  requestId?: number;
  /** Staff-only attachment: recorded but never shown to the client. */
  internal?: boolean;
  disabled?: boolean;
  disabledReason?: string;
  label?: string;
  accept?: string;
  maxBytes: number;
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<string | null>(null);

  async function upload(file: File) {
    setError(null);

    if (file.size > maxBytes) {
      setError(`Fichier trop volumineux (${formatBytes(file.size)}). Maximum ${formatBytes(maxBytes)}.`);
      return;
    }

    setBusy(true);
    try {
      setProgress("Préparation…");
      const meta = {
        filename: file.name,
        // Chrome leaves `type` empty for extensions it doesn't know; the server
        // allowlist will reject the empty string with a clear message rather
        // than us guessing a type here.
        contentType: file.type || "application/octet-stream",
        size: file.size,
        requestId,
      };

      const presign = await fetch("/api/uploads", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(meta),
      });
      if (!presign.ok) {
        const { error } = await presign.json().catch(() => ({ error: "" }));
        setError(
          error === "unsupported_type"
            ? "Ce type de fichier n'est pas accepté."
            : error === "storage_not_configured"
              ? "Le stockage de fichiers n'est pas encore configuré."
              : "Impossible de préparer l'envoi.",
        );
        return;
      }
      const { key, url } = (await presign.json()) as { key: string; url: string };

      setProgress("Envoi…");
      const put = await fetch(url, {
        method: "PUT",
        headers: { "content-type": meta.contentType },
        body: file,
      });
      if (!put.ok) {
        setError("L'envoi du fichier a échoué. Réessayez.");
        return;
      }

      setProgress("Enregistrement…");
      const record = await fetch("/api/uploads", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ...meta, key, internal }),
      });
      if (!record.ok) {
        setError("Le fichier a été envoyé mais n'a pas pu être rattaché.");
        return;
      }

      router.refresh();
    } catch {
      setError("Envoi interrompu. Vérifiez votre connexion.");
    } finally {
      setBusy(false);
      setProgress(null);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  if (disabled) {
    return (
      <p className="rounded-xl border border-dashed border-ink/20 px-4 py-3 text-sm text-ink/80">
        {disabledReason ?? "Envoi de fichiers indisponible."}
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="sr-only"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void upload(file);
        }}
      />
      <Button
        variant="secondary"
        isDisabled={busy}
        onPress={() => inputRef.current?.click()}
        className="self-start"
      >
        {busy ? <Spinner className="size-4" /> : <Icon name="upload" className="size-4" />}
        {busy ? (progress ?? "Envoi…") : label}
      </Button>
      <p className="text-xs text-ink/80">
        {formatBytes(maxBytes)} maximum — PDF, images, documents Office, archives.
      </p>
      {error && (
        <p role="status" className="text-sm text-ink">
          {error}
        </p>
      )}
    </div>
  );
}
