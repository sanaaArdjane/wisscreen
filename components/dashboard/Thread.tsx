import { cn } from "@/lib/cn";
import { formatDateTime, formatBytes } from "@/lib/format";
import { Icon } from "@/components/ui/Icon";

export type ThreadMessage = {
  id: number;
  body: string;
  internal: boolean;
  createdAt: Date;
  authorId: string | null;
  authorName: string | null;
};

export type ThreadFile = {
  id: number;
  filename: string;
  sizeBytes: number;
  internal: boolean;
  createdAt: Date;
};

/**
 * The conversation on a request, shared by both dashboards.
 *
 * `viewerId` decides which side a bubble sits on, so the same component renders
 * correctly for the client and for the staff member answering them — there is
 * one thread component, not a client one and an admin one that drift apart.
 *
 * Internal notes are visually unmistakable (dashed border, a label) because the
 * cost of mistaking one for a client-visible reply is saying something to a
 * client you meant to say about them. They are also filtered out server-side for
 * the client view — this styling is the second line, not the only one.
 */
export function Thread({
  messages,
  files,
  viewerId,
  emptyLabel = "Aucun message pour l'instant.",
}: {
  messages: ThreadMessage[];
  files?: ThreadFile[];
  viewerId: string;
  emptyLabel?: string;
}) {
  if (messages.length === 0 && (!files || files.length === 0)) {
    return <p className="py-6 text-center text-sm text-ink/80">{emptyLabel}</p>;
  }

  return (
    <div className="flex flex-col gap-4">
      {messages.map((m) => {
        const mine = m.authorId === viewerId;
        return (
          <article
            key={m.id}
            className={cn("flex flex-col gap-1", mine ? "items-end" : "items-start")}
          >
            <div
              className={cn(
                "max-w-[42rem] rounded-2xl px-4 py-3 text-sm whitespace-pre-wrap",
                m.internal
                  ? "border border-dashed border-ink/35 bg-mist text-ink"
                  : mine
                    ? "bg-ink text-paper"
                    : "border border-ink/10 bg-mist text-ink",
              )}
            >
              {m.internal && (
                <p className="mb-1 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-ink/80">
                  <Icon name="lock" className="size-3.5" />
                  Note interne — invisible pour le client
                </p>
              )}
              {m.body}
            </div>
            <p className="px-1 text-xs text-ink/80">
              {m.authorName ?? "Compte supprimé"} · {formatDateTime(m.createdAt)}
            </p>
          </article>
        );
      })}

      {files && files.length > 0 && (
        <div className="mt-2 border-t border-ink/10 pt-4">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-ink/80">
            Pièces jointes
          </p>
          <ul className="flex flex-col gap-1.5">
            {files.map((f) => (
              <li key={f.id}>
                <a
                  href={`/api/uploads?id=${f.id}`}
                  className="flex items-center gap-2.5 rounded-xl border border-ink/10 bg-paper px-3 py-2 text-sm text-ink transition-colors hover:border-ink/25"
                >
                  <Icon name="file-text" className="size-4 shrink-0 text-steel" />
                  <span className="min-w-0 flex-1 truncate">{f.filename}</span>
                  {f.internal && (
                    <span className="shrink-0 text-[11px] uppercase tracking-wider text-ink/80">
                      interne
                    </span>
                  )}
                  <span className="shrink-0 text-xs tabular-nums text-ink/80">
                    {formatBytes(f.sizeBytes)}
                  </span>
                  <Icon name="download" className="size-4 shrink-0 text-ink/80" />
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
