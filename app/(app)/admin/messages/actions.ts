"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { contactLeads } from "@/lib/db/schema";
import { requirePermission } from "@/lib/guard";
import { logActivity } from "@/lib/account";

const StatusSchema = z.object({
  id: z.coerce.number().int().positive(),
  status: z.enum(["nouveau", "traite", "archive"]),
});

/** Moves a contact-form message through the inbox. */
export async function setLeadStatus(formData: FormData): Promise<void> {
  const staff = await requirePermission("leads:write");
  const parsed = StatusSchema.safeParse({
    id: formData.get("id"),
    status: formData.get("status"),
  });
  if (!parsed.success) return;

  await db
    .update(contactLeads)
    .set({ status: parsed.data.status })
    .where(eq(contactLeads.id, parsed.data.id));

  await logActivity({
    actorId: staff.id,
    action: "lead.status_changed",
    entity: "lead",
    entityId: parsed.data.id,
    meta: { status: parsed.data.status },
  });

  revalidatePath("/admin/messages");
  revalidatePath("/admin");
}
