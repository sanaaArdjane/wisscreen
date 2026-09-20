import Link from "next/link";
import { Panel } from "@/components/dashboard/PageHeader";
import { EmptyState } from "@/components/dashboard/ui";
import { MarkAllReadButton } from "@/app/(app)/dashboard/notifications/MarkAllReadButton";
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

  return (
    <>
      {unread > 0 && (
        <div className="mb-4 flex justify-end">
          <MarkAllReadButton />
        </div>
      )}
      <Panel bodyClassName="p-0">
        <ul className="divide-y divide-ink/10">
          {rows.map((n) => {
            const body = (
              <>
                <span
                  className={cn(
                    "mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full",
                    n.readAt ? "bg-ink/5 text-ink/80" : "bg-signal/15 text-signal-deep",
                  )}
                >
                  <Icon name={TYPE_ICON[n.type] ?? "bell"} className="size-4" />
                </span>
                <span className="min-w-0 flex-1">
                  <span
                    className={cn(
                      "block text-sm",
                      n.readAt ? "text-ink/80" : "font-medium text-ink",
                    )}
                  >
                    {n.title}
                  </span>
                  {n.body && <span className="mt-0.5 block text-sm text-ink/80">{n.body}</span>}
                  <span className="mt-1 block text-xs text-ink/80">
                    {relativeTime(n.createdAt)}
                  </span>
                </span>
              </>
            );

            return (
              <li key={n.id}>
                {n.href ? (
                  <Link
                    href={n.href}
                    className="flex gap-3 px-5 py-4 transition-colors hover:bg-mist"
                  >
                    {body}
                  </Link>
                ) : (
                  <div className="flex gap-3 px-5 py-4">{body}</div>
                )}
              </li>
            );
          })}
        </ul>
      </Panel>
    </>
  );
}
