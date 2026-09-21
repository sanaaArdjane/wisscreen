"use client";

import { useRef, useState } from "react";
import { Button, Spinner } from "@heroui/react";
import { Icon } from "@/components/ui/Icon";
import { uploadFile } from "@/lib/upload-client";

/**
 * Pick a PNG/JPEG logo or signature, uploaded as a company asset. Controlled:
 * the caller owns the attachment id. `onReset`, when given, offers "revenir à
 * la valeur par défaut" — the document editor's per-document override.
 */
export function ImagePicker({
  label,
  hint,
  value,
  onChange,
  storage,
  onReset,
  name,
}: {
  label: string;
  hint?: string;
  value: number | null;
  onChange: (id: number | null) => void;
  storage: boolean;
  onReset?: () => void;
  /** Also post the id as a form field. */
  name?: string;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const input = useRef<HTMLInputElement>(null);

  async function pick(file: File) {
    setError(null);
    if (!["image/png", "image/jpeg"].includes(file.type)) {
      setError("PNG ou JPEG uniquement.");
      return;
    }
    setBusy(true);
    const result = await uploadFile(file, { company: true });
    setBusy(false);
    if (input.current) input.current.value = "";
    if (!result.ok) setError(result.error);
    else onChange(result.id);
  }

  return (
    <div className="flex flex-col gap-2">
      <span className="text-sm text-fg">{label}</span>
      {name && <input type="hidden" name={name} value={value ?? ""} />}
      <div className="flex min-h-20 items-center justify-center rounded-2xl border border-dashed border-fg/25 bg-white p-3">
        {value ? (
          // Plain <img>: an authorised redirect to a presigned URL, which the
          // image optimiser could not follow with the viewer's session.
          // eslint-disable-next-line @next/next/no-img-element
          <img src={`/api/uploads?id=${value}&inline=1`} alt={label} className="max-h-16 max-w-full object-contain" />
        ) : (
          <span className="text-xs text-ink/80">Aucune image</span>
        )}
      </div>
      <input
        ref={input}
        type="file"
        accept="image/png,image/jpeg"
        className="sr-only"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void pick(file);
        }}
      />
      <div className="flex flex-wrap gap-2">
        <Button size="sm" variant="secondary" isDisabled={!storage || busy} onPress={() => input.current?.click()}>
          {busy ? <Spinner className="size-3.5" /> : <Icon name="upload" className="size-3.5" />}
          {value ? "Remplacer" : "Téléverser"}
        </Button>
        {value && (
          <Button size="sm" variant="danger-soft" onPress={() => onChange(null)}>
            <Icon name="trash" className="size-3.5 text-danger-fg" />
            Retirer
          </Button>
        )}
        {onReset && (
          <Button size="sm" variant="ghost" onPress={onReset}>
            Par défaut
          </Button>
        )}
      </div>
      {(hint || !storage) && <p className="text-xs text-fg/80">{storage ? hint : "Stockage de fichiers non configuré."}</p>}
      {error && <p className="text-sm text-fg">{error}</p>}
    </div>
  );
}
