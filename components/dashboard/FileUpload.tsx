"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { Button, Spinner } from "@heroui/react";
import { Icon } from "@/components/ui/Icon";
import { formatBytes } from "@/lib/format";
import { uploadFile, type UploadTarget } from "@/lib/upload-client";

/**
 * Direct-to-bucket upload: presign → PUT the file to storage → record the row
 * (the steps live in `lib/upload-client.ts`, shared with the chat composer).
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
  target = {},
  internal = false,
  disabled = false,
  disabledReason,
  label = "Joindre un fichier",
  accept,
  hint = "PDF, images, documents Office, archives.",
  maxBytes,
  onUploaded,
}: {
  /** What the file is attached to. Omitted: a personal document. */
  target?: UploadTarget;
  /** Staff-only attachment: recorded but never shown to the client. */
  internal?: boolean;
  disabled?: boolean;
  disabledReason?: string;
  label?: string;
  accept?: string;
  /** What the person should send — an `upload` demo block says it in its own words. */
  hint?: string;
  maxBytes: number;
  /** Called after the row is recorded, before the refresh. */
  onUploaded?: (result: { id: number; key: string; filename: string }) => void;
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
    const result = await uploadFile(file, target, { internal, onStep: setProgress });
    setBusy(false);
    setProgress(null);
    if (inputRef.current) inputRef.current.value = "";
    if (!result.ok) {
      setError(result.error);
      return;
    }
    onUploaded?.({ id: result.id, key: result.key, filename: file.name });
    router.refresh();
  }

  if (disabled) {
    return (
      <p className="rounded-2xl bg-soft px-4 py-3 text-sm text-fg/80">
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
      <p className="text-xs text-fg/80">
        {formatBytes(maxBytes)} maximum — {hint}
      </p>
      {error && (
        <p role="status" className="text-sm text-fg">
          {error}
        </p>
      )}
    </div>
  );
}
