"use client";

import { useRef, useState, type DragEvent } from "react";
import { uploadFile } from "@/lib/upload-client";
import { Icon } from "@/components/ui/Icon";
import { cn } from "@/lib/cn";

const ACCEPT = {
  image: "image/png,image/jpeg,image/webp,image/gif,image/avif",
  video: "video/mp4,video/webm",
} as const;

const input =
  "w-full rounded-2xl bg-soft px-3 py-2.5 font-mono text-sm text-fg placeholder:text-fg/80 focus:outline-none focus:ring-2 focus:ring-fg";

/**
 * An image or video for the public site: **upload a file, or paste a link**.
 *
 * - An upload goes straight to the bucket (presigned PUT, with a progress bar — site
 *   videos can be large) as a `public` asset, and the field's value becomes
 *   `/media/<id>`, which the public site streams with a year-long cache.
 * - A link can be a `/photos/…` path already in `public/`, or any `https://` URL.
 *
 * The value is always just a string, like the rest of the content model; "" means
 * unset, and the site then shows its generated placeholder.
 */
export function MediaField({
  value,
  onChange,
  kind,
  storage,
  invalid,
}: {
  value: string;
  onChange: (value: string) => void;
  kind: "image" | "video";
  storage: boolean;
  invalid?: boolean;
}) {
  const [tab, setTab] = useState<"upload" | "link">(value && !value.startsWith("/media/") ? "link" : "upload");
  const [progress, setProgress] = useState<number | null>(null);
  const [step, setStep] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  async function upload(file: File) {
    setError(null);
    const ok = kind === "video" ? file.type.startsWith("video/") : file.type.startsWith("image/");
    if (!ok) {
      setError(kind === "video" ? "Choisissez une vidéo (MP4 ou WebM)." : "Choisissez une image (JPG, PNG, WebP, GIF, AVIF).");
      return;
    }
    setProgress(0);
    const result = await uploadFile(file, { site: true }, { onStep: setStep, onProgress: setProgress });
    setProgress(null);
    setStep(null);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    onChange(`/media/${result.id}`);
  }

  function onDrop(e: DragEvent) {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) void upload(file);
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="grid gap-3 sm:grid-cols-[11rem_minmax(0,1fr)]">
        {/* Preview */}
        <div
          className={cn(
            "relative flex aspect-[16/10] items-center justify-center overflow-hidden rounded-2xl bg-soft ring-1",
            invalid ? "ring-2 ring-fg" : "ring-fg/10",
          )}
        >
          {value ? (
            kind === "video" ? (
              <video src={value} muted playsInline preload="metadata" className="absolute inset-0 h-full w-full object-cover" />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element -- admin thumbnail of an arbitrary path or URL
              <img src={value} alt="" loading="lazy" decoding="async" className="absolute inset-0 h-full w-full object-cover" />
            )
          ) : (
            <span className="flex flex-col items-center gap-1 text-xs text-fg/80">
              <Icon name={kind === "video" ? "zap" : "file-text"} className="h-5 w-5" />
              Aucun fichier
            </span>
          )}
          {progress !== null && (
            <div className="absolute inset-x-3 bottom-3 h-1.5 overflow-hidden rounded-full bg-fg/15">
              <div className="h-full rounded-full bg-signal transition-[width]" style={{ width: `${Math.round(progress * 100)}%` }} />
            </div>
          )}
        </div>

        <div className="flex min-w-0 flex-col gap-2">
          <div role="tablist" className="flex w-fit gap-1 rounded-full bg-soft p-1 text-xs">
            {(
              [
                ["upload", "Téléverser"],
                ["link", "Lien"],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={tab === id}
                onClick={() => setTab(id)}
                className={cn("rounded-full px-3 py-1.5 font-[650]", tab === id ? "bg-fg text-on-fg" : "text-fg hover:bg-fg/8")}
              >
                {label}
              </button>
            ))}
          </div>

          {tab === "upload" ? (
            storage ? (
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragging(true);
                }}
                onDragLeave={() => setDragging(false)}
                onDrop={onDrop}
                className={cn(
                  "flex flex-1 flex-col items-center justify-center gap-1 rounded-2xl border border-dashed px-3 py-4 text-center text-sm text-fg transition-colors",
                  dragging ? "border-fg bg-fg/5" : "border-fg/25",
                )}
              >
                <input
                  ref={fileRef}
                  type="file"
                  accept={ACCEPT[kind]}
                  hidden
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) void upload(file);
                    e.target.value = "";
                  }}
                />
                {progress !== null ? (
                  <span>
                    {step ?? "Envoi…"} {Math.round(progress * 100)} %
                  </span>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() => fileRef.current?.click()}
                      className="inline-flex items-center gap-1.5 font-[650] underline underline-offset-2"
                    >
                      <Icon name="upload" className="h-4 w-4" />
                      {value ? "Remplacer le fichier" : "Choisir un fichier"}
                    </button>
                    <span className="text-xs text-fg/80">ou glissez-le ici · {kind === "video" ? "MP4, WebM — 200 Mo max" : "JPG, PNG, WebP, GIF, AVIF"}</span>
                  </>
                )}
              </div>
            ) : (
              <p className="rounded-2xl bg-soft px-3 py-3 text-sm text-fg">
                Le stockage de fichiers n&apos;est pas configuré sur cet environnement — utilisez l&apos;onglet « Lien ».
              </p>
            )
          ) : (
            <input
              value={value}
              onChange={(e) => onChange(e.target.value.trim())}
              placeholder={kind === "video" ? "/videos/… ou https://…" : "/photos/… ou https://…"}
              className={cn(input, invalid && "ring-2 ring-fg")}
              spellCheck={false}
            />
          )}

          {value && (
            <div className="flex items-center gap-3 text-xs">
              <span className="min-w-0 truncate font-mono text-fg/80" title={value}>
                {value}
              </span>
              <button type="button" onClick={() => onChange("")} className="shrink-0 font-[650] text-fg underline underline-offset-2">
                Retirer
              </button>
            </div>
          )}
        </div>
      </div>
      {error && (
        <p role="alert" className="text-sm font-[650] text-fg">
          {error}
        </p>
      )}
    </div>
  );
}
