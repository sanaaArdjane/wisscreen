"use server";

import { revalidatePath } from "next/cache";
import { and, eq, isNotNull, isNull } from "drizzle-orm";
import { db } from "@/lib/db";
import { notifications } from "@/lib/db/schema";
import { requireUser } from "@/lib/guard";
import { publish } from "@/lib/realtime";

/**
 * The caller's own feed. Every statement is scoped to the caller by its WHERE —
 * a notification is never anyone else's to read or delete, so there is no
 * permission key involved, only ownership.
 *
 * Each ends with a `publish` so the person's *other* tabs update their badge,
 * and revalidates both layouts because the server-rendered count lives there.
 */
async function done(userId: string) {
  await publish(userId, { kind: "notification" });
  revalidatePath("/dashboard", "layout");
  revalidatePath("/admin", "layout");
}

export async function markAllRead(): Promise<void> {
  const user = await requireUser();
  await db
    .update(notifications)
    .set({ readAt: new Date() })
    .where(and(eq(notifications.userId, user.id), isNull(notifications.readAt)));
  await done(user.id);
}

export async function markRead(formData: FormData): Promise<void> {
  const user = await requireUser();
  const id = Number(formData.get("id"));
  if (!Number.isInteger(id)) return;
  await db
    .update(notifications)
    .set({ readAt: new Date() })
    .where(and(eq(notifications.id, id), eq(notifications.userId, user.id)));
  await done(user.id);
}

export async function deleteNotification(formData: FormData): Promise<void> {
  const user = await requireUser();
  const id = Number(formData.get("id"));
  if (!Number.isInteger(id)) return;
  await db
    .delete(notifications)
    .where(and(eq(notifications.id, id), eq(notifications.userId, user.id)));
  await done(user.id);
}

/** "Tout effacer" clears what has been *read*. Wiping unread ones in one click
 *  would delete things the person has never seen — so they go through the
 *  per-row delete, or get read first. */
export async function clearRead(): Promise<void> {
  const user = await requireUser();
  await db
    .delete(notifications)
    .where(and(eq(notifications.userId, user.id), isNotNull(notifications.readAt)));
  await done(user.id);
}
