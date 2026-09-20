"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { user as userTable } from "@/lib/db/schema";
import { requireUser } from "@/lib/guard";
import { logActivity } from "@/lib/account";
import { optionalText, parseForm, succeed, type ActionState } from "@/lib/actions";

const ProfileSchema = z.object({
  name: z.string().trim().min(2, "Indiquez votre nom.").max(120),
  phone: optionalText,
  company: optionalText,
});

/**
 * Identity fields only.
 *
 * Email is deliberately not editable here: changing it is an authentication
 * change, and doing it properly means verifying the new address before it
 * becomes the login. Better Auth has `changeEmail` for that; until it's wired
 * with a verified flow, letting someone type a new address into a profile form
 * would hand them a way to lock themselves out.
 */
export async function updateProfile(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const current = await requireUser();
  const parsed = parseForm(ProfileSchema, formData);
  if (!parsed.ok) return parsed.state;

  await db
    .update(userTable)
    .set({
      name: parsed.data.name,
      phone: parsed.data.phone ?? null,
      company: parsed.data.company ?? null,
      updatedAt: new Date(),
    })
    .where(eq(userTable.id, current.id));

  await logActivity({ actorId: current.id, action: "profile.updated", entity: "user", entityId: current.id });

  // `layout` scope, both areas: the name is in the shell's top bar, and staff
  // edit their profile from inside /admin.
  revalidatePath("/dashboard", "layout");
  revalidatePath("/admin", "layout");
  return succeed("Profil mis à jour.");
}
