"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/guard";
import { setSetting } from "@/lib/settings";
import { logActivity } from "@/lib/account";
import { checkbox, parseForm, succeed, type ActionState } from "@/lib/actions";

const SettingsSchema = z.object({
  magicLinkEnabled: checkbox,
  registrationOpen: checkbox,
  requireEmailVerification: checkbox,
  defaultPlan: z.string().trim().min(1),
  announcement: z.string().trim().max(240),
});

/**
 * Platform switches.
 *
 * Each key is written individually rather than as one JSON blob, so
 * `app_settings` stays queryable one row at a time — `getSetting("magicLinkEnabled")`
 * is one lookup, not a parse of the whole document.
 *
 * Every checkbox posts (`checkbox` treats a missing key as false), so a submit is
 * the complete state of the form: unticking a box turns the switch off rather
 * than leaving it untouched.
 */
export async function updateSettings(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const staff = await requirePermission("settings:write");
  const parsed = parseForm(SettingsSchema, formData);
  if (!parsed.ok) return parsed.state;

  for (const [key, value] of Object.entries(parsed.data)) {
    await setSetting(key as keyof typeof parsed.data, value as never, staff.id);
  }

  await logActivity({
    actorId: staff.id,
    action: "settings.updated",
    meta: parsed.data,
  });

  // `layout` scope: the announcement banner lives in both dashboard shells.
  revalidatePath("/admin", "layout");
  revalidatePath("/dashboard", "layout");
  revalidatePath("/connexion");
  revalidatePath("/inscription");
  return succeed("Paramètres enregistrés.");
}
