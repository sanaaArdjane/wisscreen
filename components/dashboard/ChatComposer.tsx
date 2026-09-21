"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Spinner } from "@heroui/react";
import { Icon } from "@/components/ui/Icon";
import { cn } from "@/lib/cn";
import { formatBytes } from "@/lib/format";
import { IDLE, type ActionState } from "@/lib/actions";
import { uploadFile } from "@/lib/upload-client";

/**
 * The message box under a thread — a chat composer rather than the labelled
 * textarea-plus-button it replaced.
 *
 * - **Enter sends, Shift+Enter is a new line**, and the box grows with its
 *   content up to a limit.
 * - **Attachments ride along with the message.** Files are picked first and
 *   held here; on send the action creates the message and returns its id, and
 *   each file is then uploaded *onto that message* (`{ messageId }`), which is
 *   what lets the thread show it inline instead of in a pile at the bottom.
 * - **The internal-note switch recolours the whole composer** (dashed border,
 *   lock, different placeholder and button). A checkbox beside the send button
 *   was the only thing standing between a note about a client and the client.
 *   It resets to "public" after every send, so a note never becomes the
 *   default by accident.
 *
 * The action must return `values.messageId` on success; both reply actions do.
 */
const MAX_ROWS_PX = 220;

export function ChatComposer({
  action,
  requestId,
  allowInternal = false,
  allowFiles,
  maxBytes,
  accept,
  placeholder = "Écrire un message…",
}: {
  action: (prev: ActionState, formData: FormData) => Promise<ActionState>;
  requestId: number;
  /** Desk only: offers the internal-note mode. */
  allowInternal?: boolean;
  /** False when storage is not configured. */
  allowFiles: boolean;
  maxBytes: number;
  accept?: string;
  placeholder?: string;
}) {
  const router = useRouter();
  const [state, submit, pending] = useActionState<ActionState, FormData>(action, IDLE);
  const [files, setFiles] = useState<File[]>([]);
  const [internal, setInternal] = useState(false);
  const [uploading, setUploading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const textRef = useRef<HTMLTextAreaElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  // The files that belong to the submit in flight — `files` may change after.
  const outgoing = useRef<File[]>([]);
  const outgoingInternal = useRef(false);
  const handled = useRef<ActionState | null>(null);

  function grow() {
    const el = textRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, MAX_ROWS_PX)}px`;
  }

  // After a successful send: upload the held files onto the new message, then
  // reset. Guarded by identity so a re-render never uploads twice.
  useEffect(() => {
    if (!state.ok || handled.current === state) return;
    handled.current = state;
    const messageId = Number(state.values?.messageId);
    const toSend = outgoing.current;
    outgoing.current = [];

    void (async () => {
      if (Number.isInteger(messageId) && toSend.length > 0) {
        for (const [i, file] of toSend.entries()) {
          setUploading(`Envoi ${i + 1}/${toSend.length} — ${file.name}`);
          const res = await uploadFile(file, { messageId }, { internal: outgoingInternal.current });
          if (!res.ok) setError(`${file.name} : ${res.error}`);
        }
        setUploading(null);
      }
      formRef.current?.reset();
      setFiles([]);
      setInternal(false);
      if (textRef.current) textRef.current.style.height = "";
      router.refresh();
      textRef.current?.focus();
    })();
  }, [state, router]);

  function addFiles(list: FileList | null) {
    if (!list) return;
    setError(null);
    const next: File[] = [];
    for (const f of Array.from(list)) {
      if (f.size > maxBytes) setError(`${f.name} dépasse ${formatBytes(maxBytes)}.`);
      else next.push(f);
    }
    setFiles((cur) => [...cur, ...next].slice(0, 10));
    if (fileRef.current) fileRef.current.value = "";
  }

  const busy = pending || uploading !== null;

  return (
    <form
      ref={formRef}
      action={(fd) => {
        outgoing.current = files;
        outgoingInternal.current = internal;
        if (files.length) fd.set("withFiles", "1");
        if (internal) fd.set("internal", "on");
        submit(fd);
      }}
      className={cn(
        "flex flex-col gap-2 rounded-3xl border p-2 transition-colors",
        internal ? "border-dashed border-fg/45 bg-soft" : "border-fg/15 bg-panel focus-within:border-fg/40",
      )}
    >
      <input type="hidden" name="requestId" value={requestId} />

      {internal && (
        <p className="flex items-center gap-1.5 px-3 pt-1 text-xs font-[650] text-fg">
          <Icon name="lock" className="size-3.5" />
          Note interne — ni le client ni ses notifications ne la verront
        </p>
      )}

      {files.length > 0 && (
        <ul className="flex flex-wrap gap-1.5 px-2 pt-1">
          {files.map((f, i) => (
            <li
              key={`${f.name}-${i}`}
              className="flex max-w-64 items-center gap-1.5 rounded-full bg-soft py-1 pl-3 pr-1 text-xs text-fg"
            >
              <Icon name="file-text" className="size-3.5 shrink-0" />
              <span className="truncate">{f.name}</span>
              <span className="shrink-0 text-fg/80">{formatBytes(f.size)}</span>
              <button
                type="button"
                onClick={() => setFiles((cur) => cur.filter((_, j) => j !== i))}
                className="rounded-full p-1 text-danger-fg hover:bg-danger/10"
                aria-label={`Retirer ${f.name}`}
              >
                <Icon name="close" className="size-3" />
              </button>
            </li>
          ))}
        </ul>
      )}

      <textarea
        ref={textRef}
        name="body"
        rows={1}
        placeholder={internal ? "Note pour l'équipe…" : placeholder}
        aria-label={internal ? "Note interne" : "Message"}
        onInput={grow}
        onKeyDown={(e) => {
          // Enter sends; Shift+Enter, and Enter mid-IME-composition, do not.
          if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
            e.preventDefault();
            if (!busy) formRef.current?.requestSubmit();
          }
        }}
        className="max-h-[220px] min-h-11 w-full resize-none bg-transparent px-3 py-2.5 text-sm text-fg placeholder:text-fg/80 focus:outline-none"
      />

      <div className="flex items-center gap-1 px-1">
        {allowFiles && (
          <>
            <input
              ref={fileRef}
              type="file"
              multiple
              accept={accept}
              className="sr-only"
              onChange={(e) => addFiles(e.target.files)}
            />
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="flex items-center gap-1.5 rounded-full px-3 py-2 text-xs font-[650] text-fg hover:bg-fg/8"
              aria-label="Joindre des fichiers"
            >
              <Icon name="upload" className="size-4" />
              <span className="hidden sm:inline">Joindre</span>
            </button>
          </>
        )}
        {allowInternal && (
          <button
            type="button"
            role="switch"
            aria-checked={internal}
            onClick={() => setInternal((v) => !v)}
            className={cn(
              "flex items-center gap-1.5 rounded-full px-3 py-2 text-xs font-[650] transition-colors",
              internal ? "bg-fg text-on-fg" : "text-fg hover:bg-fg/8",
            )}
          >
            <Icon name="lock" className="size-4" />
            Note interne
          </button>
        )}
        <span className="flex-1 truncate px-2 text-xs text-fg/80">
          {uploading ?? (error || (state.ok === false && state.message) || (
            <span className="hidden md:inline">Entrée pour envoyer · Maj+Entrée pour aller à la ligne</span>
          ))}
        </span>
        <button
          type="submit"
          disabled={busy}
          className={cn(
            "flex items-center gap-2 rounded-full px-4 py-2 text-sm font-[650] transition-colors disabled:opacity-60",
            internal ? "bg-fg text-on-fg hover:bg-fg-hover" : "control-signal",
          )}
        >
          {busy ? <Spinner className="size-4" /> : <Icon name="send" className="size-4" />}
          {internal ? "Ajouter la note" : "Envoyer"}
        </button>
      </div>
    </form>
  );
}
