"use server";

import { revalidatePath } from "next/cache";
import { and, eq, isNull } from "drizzle-orm";
import { db } from "@/lib/db";
import { notifications } from "@/lib/db/schema";
import { requireUser } from "@/lib/guard";

/** Marks everything unread as read. Scoped to the caller by the WHERE, always. */
export async function markAllRead(): Promise<void> {
  const user = await requireUser();
  await db
    .update(notifications)
    .set({ readAt: new Date() })
    .where(and(eq(notifications.userId, user.id), isNull(notifications.readAt)));

  // Both paths: the bell count lives in the layout, which /admin renders too.
  revalidatePath("/dashboard", "layout");
  revalidatePath("/admin", "layout");
}

export async function markRead(formData: FormData): Promise<void> {
  const user = await requireUser();
  const id = Number(formData.get("id"));
  if (!Number.isInteger(id)) return;

  await db
    .update(notifications)
    .set({ readAt: new Date() })
    .where(and(eq(notifications.id, id), eq(notifications.userId, user.id)));

  revalidatePath("/dashboard", "layout");
  revalidatePath("/admin", "layout");
}
