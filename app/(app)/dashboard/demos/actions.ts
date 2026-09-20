"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { demoRuns } from "@/lib/db/schema";
import { requireUser } from "@/lib/guard";
import { consume } from "@/lib/quotas";
import { getScenario } from "@/lib/demo";
import { logActivity } from "@/lib/account";
import { parseForm, fail, type ActionState } from "@/lib/actions";

const RunSchema = z.object({
  slug: z.string().trim().min(1),
  input: z.string().trim().min(1, "Saisissez quelque chose à analyser.").max(4000),
});

/**
 * Runs a sandbox scenario and records it.
 *
 * The quota is spent even when the scenario itself is simulated, because the
 * point of the meter is to behave exactly as it will when the engines are real —
 * a limit that only starts applying later is a limit nobody has tested.
 *
 * A refused run is still written to `demo_runs` with `outcome: "quota"`. That is
 * deliberate: "this customer kept hitting their ceiling" is the single most
 * useful thing this table can tell the admin, and it is invisible if refusals
 * aren't recorded.
 */
export async function runDemo(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser();
  const parsed = parseForm(RunSchema, formData);
  if (!parsed.ok) return parsed.state;

  const scenario = getScenario(parsed.data.slug);
  if (!scenario) return fail("Démo inconnue.");

  const quota = await consume(user.id, "demo.runs");
  if (!quota.ok) {
    await db.insert(demoRuns).values({
      userId: user.id,
      serviceSlug: scenario.slug,
      input: parsed.data.input.slice(0, 500),
      outcome: "quota",
    });
    revalidatePath("/dashboard/demos");
    return fail(
      quota.reason === "not_included"
        ? "Les démos ne sont pas comprises dans votre formule."
        : "Vous avez atteint votre quota de démos pour ce mois.",
    );
  }

  const started = Date.now();
  const result = scenario.run(parsed.data.input);

  await db.insert(demoRuns).values({
    userId: user.id,
    serviceSlug: scenario.slug,
    input: parsed.data.input.slice(0, 500),
    result,
    outcome: "ok",
    durationMs: Date.now() - started,
  });

  await logActivity({
    actorId: user.id,
    action: "demo.run",
    entity: "demo",
    entityId: scenario.slug,
  });

  revalidatePath("/dashboard/demos");
  return { ok: true, message: result.summary };
}
