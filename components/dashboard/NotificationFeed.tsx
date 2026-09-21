import { Panel } from "@/components/dashboard/PageHeader";
import { EmptyState } from "@/components/dashboard/ui";
import {
  ClearReadButton,
  MarkAllReadButton,
} from "@/app/(app)/dashboard/notifications/MarkAllReadButton";
import { deleteNotification } from "@/app/(app)/dashboard/notifications/actions";
import { relativeTime } from "@/lib/format";
import { cn } from "@/lib/cn";
import { Icon } from "@/components/ui/Icon";
import type { IconName } from "@/lib/types";

const TYPE_ICON: Record<string, IconName> = {
  request: "inbox",
  message: "mail",
  quote: "file-text",
  invoice: "receipt",
  subscription: "credit-card",
  demo: "zap",
  lead: "mail",
  system: "bell",
};

export type FeedRow = {
  id: number;
  type: string;
  title: string;
  body: string | null;
  href: string | null;
  readAt: Date | null;
  createdAt: Date;
};

/**
 * One notification feed, rendered in whichever shell the viewer belongs to.
 *
 * Shared rather than duplicated because a staff member's notifications are the
 * same rows as a client's — only the surrounding chrome differs.
 */
export function NotificationFeed({
  rows,
  emptyTitle,
  emptyDescription,
}: {
  rows: FeedRow[];
  emptyTitle: string;
  emptyDescription?: string;
}) {
  if (rows.length === 0) {
    return <EmptyState title={emptyTitle} description={emptyDescription} />;
  }

  const unread = rows.filter((n) => !n.readAt).length;
  const read = rows.length - unread;

  return (
    <>
      {(unread > 0 || read > 0) && (
        <div className="mb-4 flex flex-wrap items-start justify-end gap-2">
          {read > 0 && <ClearReadButton count={read} />}
          {unread > 0 && <MarkAllReadButton />}
        </div>
      )}
      <Panel bodyClassName="p-0">
        <ul className="divide-y divide-fg/10">
          {rows.map((n) => {
            const body = (
              <>
                <span
                  className={cn(
                    "mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-[30%]",
                    n.readAt ? "bg-soft text-fg/80" : "bg-signal text-abyss",
                  )}
                >
                  <Icon name={TYPE_ICON[n.type] ?? "bell"} className="size-4" />
                </span>
                <span className="min-w-0 flex-1">
                  <span
                    className={cn(
                      "block text-sm",
                      n.readAt ? "font-[450] text-fg/80" : "font-[650] text-fg",
                    )}
                  >
                    {n.title}
                  </span>
                  {n.body && <span className="mt-0.5 block text-sm text-fg/80">{n.body}</span>}
                  <span className="mt-1 block text-xs text-fg/80">
                    {relativeTime(n.createdAt)}
                  </span>
                </span>
              </>
            );

            return (
              <li key={n.id} className="group flex items-start">
                {/* Through the open route, so following a notification is what
                    marks it read — see app/api/notifications/[id]/open. A plain
                    <a>, not <Link>: it is a redirecting GET, not a page. */}
                {n.href ? (
                  <a
                    href={`/api/notifications/${n.id}/open`}
                    className="flex min-w-0 flex-1 gap-3 px-6 py-4 transition-colors hover:bg-soft"
                  >
                    {body}
                  </a>
                ) : (
                  <div className="flex min-w-0 flex-1 gap-3 px-6 py-4">{body}</div>
                )}
                {/* A single notification is the viewer's own and trivially
                    recreated by nothing — so one click, no arming step. It is
                    still red, because it still deletes. */}
                <form action={deleteNotification} className="shrink-0 py-3 pr-4">
                  <input type="hidden" name="id" value={n.id} />
                  <button
                    type="submit"
                    className="rounded-full p-2 text-danger-fg hover:bg-danger/10"
                    aria-label={`Supprimer « ${n.title} »`}
                  >
                    <Icon name="trash" className="size-4" />
                  </button>
                </form>
              </li>
            );
          })}
        </ul>
      </Panel>
    </>
  );
}
