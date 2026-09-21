import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import { formatBytes } from "@/lib/format";
import { Icon } from "@/components/ui/Icon";
import { ThreadViewport } from "./ThreadViewport";

export type ThreadFile = {
  id: number;
  filename: string;
  sizeBytes: number;
  internal: boolean;
  createdAt: Date;
};

export type ThreadMessage = {
  id: number;
  body: string;
  internal: boolean;
  createdAt: Date;
  /** When the *other* side read it. */
  readAt: Date | null;
  authorId: string | null;
  authorName: string | null;
  /** Which side wrote it — drives the "équipe" label and the read logic. */
  authorSide: "client" | "team";
  files?: ThreadFile[];
};

/**
 * The conversation on a request, shared by both dashboards.
 *
 * `viewerId` decides which side a bubble sits on, so the same component renders
 * correctly for the client and for the staff member answering them — one
 * thread component, not two that drift apart.
 *
 * What makes it read as a conversation rather than a log:
 *  - **Grouping.** Consecutive messages from one author within five minutes
 *    share one name line and one avatar; the time moves to the group.
 *  - **Day separators** — "Aujourd'hui", "Hier", then the date.
 *  - **Attachments inline** with the message they were sent with
 *    (`attachments.message_id`, which existed in the schema and was never
 *    written until the composer started using it).
 *  - **An unread divider** before the first message from the other side the
 *    viewer hasn't seen, and "Lu" under the viewer's own latest message once
 *    the other side has opened the thread.
 *  - **A scroll viewport** that opens at the bottom and follows new messages
 *    arriving live, unless the reader has scrolled up to read history.
 *
 * Internal notes stay visually unmistakable (dashed border, lock label) because
 * mistaking one for a client-visible reply means saying something to a client
 * you meant to say about them. They are also filtered out server-side for the
 * client view — this styling is the second line, not the only one.
 *
 * All timestamps are formatted with an explicit `Africa/Algiers` zone: this
 * renders on the server, and a server in UTC would otherwise put a 00:30
 * message under "Hier".
 */

const TZ = "Africa/Algiers";
const GROUP_MS = 5 * 60 * 1000;

const dayKey = new Intl.DateTimeFormat("fr-CA", { timeZone: TZ, dateStyle: "short" });
const time = new Intl.DateTimeFormat("fr-FR", { timeZone: TZ, hour: "2-digit", minute: "2-digit" });
const longDay = new Intl.DateTimeFormat("fr-FR", { timeZone: TZ, weekday: "long", day: "numeric", month: "long" });
const longDayYear = new Intl.DateTimeFormat("fr-FR", { timeZone: TZ, day: "numeric", month: "long", year: "numeric" });
const full = new Intl.DateTimeFormat("fr-FR", { timeZone: TZ, dateStyle: "full", timeStyle: "short" });

function dayLabel(d: Date, now: Date): string {
  const k = dayKey.format(d);
  if (k === dayKey.format(now)) return "Aujourd'hui";
  if (k === dayKey.format(new Date(now.getTime() - 86_400_000))) return "Hier";
  const sameYear = d.getUTCFullYear() === now.getUTCFullYear();
  const label = sameYear ? longDay.format(d) : longDayYear.format(d);
  return label.charAt(0).toUpperCase() + label.slice(1);
}

function initials(name: string | null): string {
  if (!name) return "W";
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? "") + (parts.length > 1 ? (parts[parts.length - 1][0] ?? "") : "")).toUpperCase() || "?";
}

type Group = {
  key: string;
  authorId: string | null;
  authorName: string | null;
  authorSide: "client" | "team";
  internal: boolean;
  mine: boolean;
  messages: ThreadMessage[];
};

export function Thread({
  messages,
  looseFiles,
  viewerId,
  viewerSide,
  onOpen,
  emptyLabel = "Aucun message pour l'instant.",
  composer,
  now = new Date(),
}: {
  messages: ThreadMessage[];
  /** Files attached to the request rather than to one message. */
  looseFiles?: ThreadFile[];
  viewerId: string;
  /** Whose dashboard this is: the other side's messages count as unread. */
  viewerSide: "client" | "team";
  /** Server action that marks the other side's messages read. */
  onOpen?: () => Promise<void>;
  emptyLabel?: string;
  /** Rendered pinned under the scroll area. */
  composer?: ReactNode;
  now?: Date;
}) {
  // Group consecutive messages by author, day and kind.
  const days: { label: string; groups: Group[] }[] = [];
  for (const m of messages) {
    const label = dayLabel(m.createdAt, now);
    let day = days[days.length - 1];
    if (!day || day.label !== label) {
      day = { label, groups: [] };
      days.push(day);
    }
    const last = day.groups[day.groups.length - 1];
    const prev = last?.messages[last.messages.length - 1];
    if (
      last &&
      prev &&
      last.authorId === m.authorId &&
      last.internal === m.internal &&
      m.createdAt.getTime() - prev.createdAt.getTime() < GROUP_MS
    ) {
      last.messages.push(m);
    } else {
      day.groups.push({
        key: `g${m.id}`,
        authorId: m.authorId,
        authorName: m.authorName,
        authorSide: m.authorSide,
        internal: m.internal,
        mine: m.authorId === viewerId,
        messages: [m],
      });
    }
  }

  const firstUnread = messages.find((m) => m.authorSide !== viewerSide && !m.internal && !m.readAt);
  const lastMine = [...messages].reverse().find((m) => m.authorId === viewerId && !m.internal);
  const unreadCount = messages.filter((m) => m.authorSide !== viewerSide && !m.internal && !m.readAt).length;

  return (
    <div className="flex flex-col">
      <ThreadViewport count={messages.length} onOpen={unreadCount > 0 ? onOpen : undefined}>
        {messages.length === 0 && (!looseFiles || looseFiles.length === 0) ? (
          <div className="flex flex-col items-center gap-2 py-12 text-center">
            <span className="flex size-12 items-center justify-center rounded-full bg-soft text-fg/80">
              <Icon name="mail" className="size-5" />
            </span>
            <p className="max-w-sm text-sm text-fg/80">{emptyLabel}</p>
          </div>
        ) : (
          <div className="flex flex-col gap-5">
            {days.map((day) => (
              <section key={day.label} className="flex flex-col gap-4" aria-label={day.label}>
                <div className="sticky top-0 z-10 flex justify-center">
                  <span className="rounded-full border border-fg/10 bg-panel px-3 py-1 text-xs font-[650] text-fg/80 shadow-sm">
                    {day.label}
                  </span>
                </div>
                {day.groups.map((g) => (
                  <div key={g.key}>
                    {g.messages.some((m) => m.id === firstUnread?.id) && (
                      <div className="mb-4 flex items-center gap-3" role="separator" aria-label="Nouveaux messages">
                        <span className="h-px flex-1 bg-signal" />
                        <span className="text-xs font-[650] text-signal-fg">Nouveaux messages</span>
                        <span className="h-px flex-1 bg-signal" />
                      </div>
                    )}
                    <MessageGroup group={g} lastMineId={lastMine?.id} />
                  </div>
                ))}
              </section>
            ))}

            {looseFiles && looseFiles.length > 0 && (
              <div className="rounded-2xl border border-fg/10 p-4">
                <p className="mb-2 text-xs font-[650] text-fg/80">Pièces jointes de la demande</p>
                <FileList files={looseFiles} />
              </div>
            )}
          </div>
        )}
      </ThreadViewport>
      {composer && <div className="border-t border-fg/10 pt-4">{composer}</div>}
    </div>
  );
}

function MessageGroup({ group: g, lastMineId }: { group: Group; lastMineId?: number }) {
  const first = g.messages[0];
  const name = g.mine ? "Vous" : (g.authorName ?? "Équipe WICLOUD");
  return (
    <article className={cn("flex gap-3", g.mine ? "flex-row-reverse" : "flex-row")}>
      <span
        aria-hidden
        className={cn(
          "mt-5 flex size-8 shrink-0 items-center justify-center rounded-full text-[11px] font-[650]",
          g.authorSide === "team" ? "bg-fg text-on-fg" : "bg-soft text-fg ring-1 ring-fg/15",
        )}
      >
        {g.authorSide === "team" && !g.authorName ? "W" : initials(g.authorName)}
      </span>
      <div className={cn("flex min-w-0 max-w-[min(42rem,85%)] flex-col gap-1", g.mine ? "items-end" : "items-start")}>
        <p className="flex items-baseline gap-2 px-1 text-xs">
          <span className="font-[650] text-fg">{name}</span>
          {!g.mine && g.authorSide === "team" && g.authorName && <span className="text-fg/80">· Équipe WICLOUD</span>}
          <time dateTime={first.createdAt.toISOString()} title={full.format(first.createdAt)} className="text-fg/80">
            {time.format(first.createdAt)}
          </time>
        </p>
        {g.internal && (
          <p className="flex items-center gap-1.5 px-1 text-xs font-[650] text-fg/80">
            <Icon name="lock" className="size-3.5" />
            Note interne — invisible pour le client
          </p>
        )}
        {g.messages.map((m, i) => (
          <div key={m.id} className={cn("group flex flex-col gap-1.5", g.mine ? "items-end" : "items-start")}>
            <div
              className={cn(
                "whitespace-pre-wrap break-words px-4 py-2.5 text-sm font-[450]",
                // Tighter corners where bubbles of one group touch, the way
                // every chat app draws a run of messages.
                g.mine
                  ? cn("rounded-3xl", i > 0 && "rounded-tr-lg", i < g.messages.length - 1 && "rounded-br-lg")
                  : cn("rounded-3xl", i > 0 && "rounded-tl-lg", i < g.messages.length - 1 && "rounded-bl-lg"),
                m.internal
                  ? "border border-dashed border-fg/35 bg-soft text-fg"
                  : g.mine
                    ? "bg-fg text-on-fg"
                    : "bg-soft text-fg",
              )}
            >
              {m.body}
            </div>
            {m.files && m.files.length > 0 && (
              <div className="w-full max-w-sm">
                <FileList files={m.files} />
              </div>
            )}
            {/* Per-message time on hover for everything after the first. */}
            {i > 0 && (
              <time
                dateTime={m.createdAt.toISOString()}
                className="px-1 text-[11px] text-fg/80 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100"
              >
                {time.format(m.createdAt)}
              </time>
            )}
            {m.id === lastMineId && (
              <p className="px-1 text-[11px] text-fg/80">
                {m.readAt ? (
                  <span className="inline-flex items-center gap-1">
                    <Icon name="check" className="size-3" />
                    Lu {time.format(m.readAt)}
                  </span>
                ) : (
                  "Envoyé"
                )}
              </p>
            )}
          </div>
        ))}
      </div>
    </article>
  );
}

function FileList({ files }: { files: ThreadFile[] }) {
  return (
    <ul className="flex flex-col gap-1.5">
      {files.map((f) => (
        <li key={f.id}>
          <a
            href={`/api/uploads?id=${f.id}`}
            className="flex items-center gap-2.5 rounded-2xl border border-fg/10 bg-panel px-3.5 py-2.5 text-sm font-[450] text-fg transition-colors hover:bg-soft"
          >
            <Icon name="file-text" className="size-4 shrink-0 text-fg/80" />
            <span className="min-w-0 flex-1 truncate">{f.filename}</span>
            {f.internal && <span className="shrink-0 text-xs text-fg/80">interne</span>}
            <span className="shrink-0 text-xs tabular-nums text-fg/80">{formatBytes(f.sizeBytes)}</span>
            <Icon name="download" className="size-4 shrink-0 text-fg/80" />
          </a>
        </li>
      ))}
    </ul>
  );
}
