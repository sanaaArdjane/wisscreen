"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { and, eq, inArray, notInArray, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { attachments, demoAccess, demoRuns, demoSecrets, demos } from "@/lib/db/schema";
import { requirePermission } from "@/lib/guard";
import { logActivity, notify, notifyMany } from "@/lib/account";
import { fail, parseForm, succeed, type ActionState } from "@/lib/actions";
import { demoSecretAad, encryptSecret, encryptionConfigured } from "@/lib/crypto";
import {
  DEMO_STATUSES,
  DemoBlockSchema,
  declaredSecrets,
  type DemoBlock,
} from "@/lib/demos";
import { getSolutions } from "@/lib/content";
import { deleteObject } from "@/lib/storage";
import { sendEmail } from "@/lib/email";
import { SITE_URL } from "@/lib/site";

/**
 * The desk's side of demos: author them, grant them, and answer the files
 * customers send in.
 *
 * Every action re-checks its permission at the top — `demos:write` to author
 * and grant, `demos:delete` to delete. These keys existed in
 * `lib/permissions.ts` from the start with nothing checking them.
 */

function refresh(id?: number, slug?: string) {
  revalidatePath("/admin/demos");
  if (id) revalidatePath(`/admin/demos/${id}`);
  revalidatePath("/dashboard/demos");
  if (slug) revalidatePath(`/dashboard/demos/${slug}`);
  revalidatePath("/dashboard");
}

const dateOrNull = z
  .string()
  .trim()
  .optional()
  .transform((v) => (v ? new Date(`${v}T23:59:59`) : null))
  .refine((v) => v === null || !Number.isNaN(v.getTime()), "Date invalide.");

const DemoSchema = z.object({
  demoId: z.coerce.number().int().positive().optional(),
  title: z.string().trim().min(3, "Au moins 3 caractères.").max(160),
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Lettres minuscules, chiffres et tirets uniquement.")
    .max(60),
  summary: z.string().trim().max(1000).optional(),
  category: z.string().trim().max(60).optional(),
  serviceSlug: z
    .string()
    .optional()
    .transform((v) => (v ? v : null)),
  status: z.enum(DEMO_STATUSES),
  visibility: z.enum(["assigned", "all_clients"]),
  expiresAt: dateOrNull,
});

/** A new or replacement secret value, posted beside — never inside — the blocks. */
const SecretInput = z.object({
  blockId: z.string().min(1).max(64),
  label: z.string().min(1).max(80),
  value: z.string().min(1).max(20_000),
});

/**
 * Create or update a demo.
 *
 * **Blocks are posted as one JSON hidden input each, not as parallel arrays.**
 * The devis editor (`DocumentEditor`) zips `label[]`/`quantity[]`/`unitCents[]` by index, which is
 * safe only because every line posts the same three fields. Blocks are a
 * discriminated union: a link has no `host`, an SSH block has no `url`. One
 * conditionally-rendered input and every later block's fields shift by one —
 * silently, with nothing here able to notice. So each block carries itself.
 *
 * Secret values arrive as separate `secret` inputs, only when the admin typed a
 * new one. They are encrypted into `demo_secrets` and stripped from the
 * blocks; a secret the blocks no longer declare is deleted.
 */
export async function saveDemo(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const staff = await requirePermission("demos:write");

  const blockValues = formData.getAll("block").map(String);
  const secretValues = formData.getAll("secret").map(String);
  // parseForm collects repeated names into arrays; these are handled below.
  const scalar = new FormData();
  for (const [k, v] of formData.entries()) if (k !== "block" && k !== "secret") scalar.append(k, v);

  const parsed = parseForm(DemoSchema, scalar);
  if (!parsed.ok) return parsed.state;
  const data = parsed.data;
  // Solutions are edited in /admin/site, so the slug is checked against the live list.
  if (data.serviceSlug && !(await getSolutions({ includeHidden: true })).some((s) => s.slug === data.serviceSlug)) {
    return fail("Vérifiez les champs signalés.", { serviceSlug: "Solution inconnue." });
  }

  const blocksParsed = z.array(DemoBlockSchema).max(50).safeParse(
    blockValues.map((raw) => {
      try {
        return JSON.parse(raw);
      } catch {
        return null;
      }
    }),
  );
  if (!blocksParsed.success) {
    const issue = blocksParsed.error.issues[0];
    return fail(`Un bloc est invalide${issue?.message ? ` : ${issue.message}` : ""}.`);
  }
  let blocks: DemoBlock[] = blocksParsed.data;

  // Two blocks with one id would make their secrets indistinguishable.
  if (new Set(blocks.map((b) => b.id)).size !== blocks.length) {
    return fail("Deux blocs portent le même identifiant — rechargez la page.");
  }

  const secrets = [];
  for (const raw of secretValues) {
    try {
      const s = SecretInput.parse(JSON.parse(raw));
      secrets.push(s);
    } catch {
      return fail("Un identifiant secret est invalide.");
    }
  }
  if (secrets.length > 0 && !encryptionConfigured()) {
    return fail(
      "ENCRYPTION_KEY n'est pas défini : les identifiants secrets ne peuvent pas être enregistrés. Rien n'a été stocké en clair.",
    );
  }

  // Strip any value that slipped into a secret row. The UI never puts one
  // there; this makes it true whatever the UI does.
  blocks = blocks.map((b) =>
    b.kind === "credentials"
      ? { ...b, fields: b.fields.map((f) => (f.secret ? { label: f.label, secret: true } : f)) }
      : b,
  );

  const declared = declaredSecrets(blocks);
  for (const s of secrets) {
    if (!declared.some((d) => d.blockId === s.blockId && d.label === s.label)) {
      return fail(`Le secret « ${s.label} » ne correspond à aucun bloc.`);
    }
  }

  // A file block may only point at a file uploaded onto this very demo.
  const fileIds = blocks.flatMap((b) => (b.kind === "file" && b.attachmentId ? [b.attachmentId] : []));
  if (fileIds.length > 0) {
    if (!data.demoId) return fail("Enregistrez la démo avant d'y joindre des fichiers.");
    const owned = await db
      .select({ id: attachments.id })
      .from(attachments)
      .where(and(inArray(attachments.id, fileIds), eq(attachments.demoId, data.demoId)));
    if (owned.length !== new Set(fileIds).size) return fail("Un fichier ne fait pas partie de cette démo.");
  }

  const values = {
    title: data.title,
    slug: data.slug,
    summary: data.summary || null,
    category: data.category || null,
    serviceSlug: data.serviceSlug,
    status: data.status,
    visibility: data.visibility,
    expiresAt: data.expiresAt,
    blocks,
    updatedAt: new Date(),
  };

  let demoId = data.demoId;
  let wasPublished = false;
  try {
    if (demoId) {
      const [before] = await db.select({ status: demos.status }).from(demos).where(eq(demos.id, demoId)).limit(1);
      if (!before) return fail("Démo introuvable.");
      wasPublished = before.status === "publie";
      await db.update(demos).set(values).where(eq(demos.id, demoId));
    } else {
      const [row] = await db
        .insert(demos)
        .values({ ...values, createdById: staff.id })
        .returning({ id: demos.id });
      demoId = row.id;
    }
  } catch (err) {
    if (typeof err === "object" && err !== null && "code" in err && err.code === "23505") {
      return fail("Ce slug est déjà utilisé par une autre démo.", { slug: "Déjà utilisé." });
    }
    throw err;
  }

  for (const s of secrets) {
    const ciphertext = encryptSecret(s.value, demoSecretAad(demoId, s.blockId, s.label));
    await db
      .insert(demoSecrets)
      .values({ demoId, blockId: s.blockId, label: s.label, ciphertext, createdById: staff.id })
      .onConflictDoUpdate({
        target: [demoSecrets.demoId, demoSecrets.blockId, demoSecrets.label],
        set: { ciphertext, updatedAt: new Date() },
      });
  }

  // Secrets whose block or row was removed go with it.
  const keep = declared.map((d) => `${d.blockId}\u001f${d.label}`);
  await db
    .delete(demoSecrets)
    .where(
      and(
        eq(demoSecrets.demoId, demoId),
        keep.length
          ? notInArray(sql`${demoSecrets.blockId} || chr(31) || ${demoSecrets.label}`, keep)
          : undefined,
      ),
    );

  await logActivity({
    actorId: staff.id,
    action: data.demoId ? "demo.updated" : "demo.created",
    entity: "demo",
    entityId: demoId,
    meta: { slug: data.slug, status: data.status, blocks: blocks.length, secretsChanged: secrets.length },
  });

  // Publishing tells the people who can now open it.
  if (data.status === "publie" && !wasPublished) {
    const grants = await db
      .select({ userId: demoAccess.userId })
      .from(demoAccess)
      .where(and(eq(demoAccess.demoId, demoId), sql`${demoAccess.revokedAt} is null`));
    await notifyMany(
      grants.map((g) => g.userId),
      {
        type: "demo",
        title: `Démo disponible : ${data.title}`,
        body: data.summary || undefined,
        href: `/dashboard/demos/${data.slug}`,
        actorId: staff.id,
        entity: "demo",
        entityId: demoId,
      },
    );
  }

  refresh(demoId, data.slug);
  if (!data.demoId) redirect(`/admin/demos/${demoId}`);
  return succeed(secrets.length ? "Démo enregistrée. Identifiants chiffrés." : "Démo enregistrée.");
}

/** Delete a demo. Grants, secrets and its own files cascade; run history stays. */
export async function deleteDemo(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const staff = await requirePermission("demos:delete");
  const id = Number(formData.get("demoId"));
  const [demo] = Number.isInteger(id)
    ? await db.select().from(demos).where(eq(demos.id, id)).limit(1)
    : [];
  if (!demo) return fail("Démo introuvable.");
  if (String(formData.get("confirm") ?? "").trim() !== demo.slug) {
    return fail(`Saisissez exactement « ${demo.slug} » pour confirmer.`);
  }

  const files = await db.select({ key: attachments.key }).from(attachments).where(eq(attachments.demoId, id));
  await db.delete(demos).where(eq(demos.id, id));
  // Best effort: the rows are gone, so these objects are unreachable anyway.
  await Promise.all(files.map((f) => deleteObject(f.key).catch(() => {})));

  await logActivity({
    actorId: staff.id,
    action: "demo.deleted",
    entity: "demo",
    entityId: id,
    meta: { slug: demo.slug, title: demo.title },
  });
  refresh(undefined, demo.slug);
  redirect("/admin/demos");
}

/** Remove one file authored on a demo. Any file block pointing at it is emptied. */
export async function deleteDemoFile(formData: FormData): Promise<void> {
  const staff = await requirePermission("demos:write");
  const id = Number(formData.get("attachmentId"));
  if (!Number.isInteger(id)) return;
  const [file] = await db.select().from(attachments).where(eq(attachments.id, id)).limit(1);
  if (!file?.demoId) return;

  const [demo] = await db.select().from(demos).where(eq(demos.id, file.demoId)).limit(1);
  await db.delete(attachments).where(eq(attachments.id, id));
  await deleteObject(file.key).catch(() => {});
  if (demo) {
    const blocks = (demo.blocks as DemoBlock[]).map((b) =>
      b.kind === "file" && b.attachmentId === id ? { ...b, attachmentId: undefined, filename: undefined } : b,
    );
    await db.update(demos).set({ blocks, updatedAt: new Date() }).where(eq(demos.id, demo.id));
  }
  await logActivity({
    actorId: staff.id,
    action: "demo.file_deleted",
    entity: "demo",
    entityId: file.demoId,
    meta: { filename: file.filename },
  });
  refresh(file.demoId, demo?.slug);
}

/* ───────────────────────────────── Access ───────────────────────────────── */

const GrantSchema = z.object({
  demoId: z.coerce.number().int().positive(),
  userId: z.union([z.string().min(1), z.array(z.string().min(1))]).transform((v) => (Array.isArray(v) ? v : [v])),
  expiresAt: dateOrNull,
  note: z.string().trim().max(500).optional(),
});

export async function grantDemoAccess(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const staff = await requirePermission("demos:write");
  const parsed = parseForm(GrantSchema, formData);
  if (!parsed.ok) {
    return parsed.state.fieldErrors?.userId ? fail("Choisissez au moins un client.") : parsed.state;
  }
  const { demoId, userId: userIds, expiresAt, note } = parsed.data;

  const [demo] = await db.select().from(demos).where(eq(demos.id, demoId)).limit(1);
  if (!demo) return fail("Démo introuvable.");

  for (const userId of userIds) {
    // A re-grant after a revoke revives the row rather than adding a second one.
    await db
      .insert(demoAccess)
      .values({ demoId, userId, grantedById: staff.id, expiresAt, note: note || null })
      .onConflictDoUpdate({
        target: [demoAccess.demoId, demoAccess.userId],
        set: { revokedAt: null, expiresAt, note: note || null, grantedById: staff.id },
      });
  }

  await logActivity({
    actorId: staff.id,
    action: "demo.access_granted",
    entity: "demo",
    entityId: demoId,
    meta: { userIds, expiresAt },
  });

  // Only a published demo is worth announcing; a draft's grants are announced
  // by `saveDemo` at the moment it is published.
  if (demo.status === "publie") {
    await notifyMany(userIds, {
      type: "demo",
      title: `Nouvelle démo : ${demo.title}`,
      body: demo.summary || "Une démo vient d'être mise à votre disposition.",
      href: `/dashboard/demos/${demo.slug}`,
      actorId: staff.id,
      entity: "demo",
      entityId: demoId,
    });
  }

  refresh(demoId, demo.slug);
  return succeed(
    `${userIds.length} accès accordé${userIds.length > 1 ? "s" : ""}${demo.status === "publie" ? "" : " — visible dès la publication"}.`,
  );
}

export async function revokeDemoAccess(formData: FormData): Promise<void> {
  const staff = await requirePermission("demos:write");
  const id = Number(formData.get("accessId"));
  if (!Number.isInteger(id)) return;
  const [row] = await db
    .update(demoAccess)
    .set({ revokedAt: new Date() })
    .where(eq(demoAccess.id, id))
    .returning();
  if (!row) return;
  await logActivity({
    actorId: staff.id,
    action: "demo.access_revoked",
    entity: "demo",
    entityId: row.demoId,
    meta: { userId: row.userId },
  });
  refresh(row.demoId);
}

/** Forget a grant entirely, history included. The red one. */
export async function deleteDemoAccess(formData: FormData): Promise<void> {
  const staff = await requirePermission("demos:delete");
  const id = Number(formData.get("accessId"));
  if (!Number.isInteger(id)) return;
  const [row] = await db.delete(demoAccess).where(eq(demoAccess.id, id)).returning();
  if (!row) return;
  await logActivity({
    actorId: staff.id,
    action: "demo.access_deleted",
    entity: "demo",
    entityId: row.demoId,
    meta: { userId: row.userId },
  });
  refresh(row.demoId);
}

/* ────────────────────────────────── Runs ────────────────────────────────── */

const CompleteSchema = z.object({
  runId: z.coerce.number().int().positive(),
  outcome: z.enum(["en_cours", "ok", "error"]),
  note: z.string().trim().max(5000).optional(),
  summary: z.string().trim().max(1000).optional(),
});

/**
 * Answer a customer's submission: mark it in progress, or processed with a note
 * (and whatever deliverable was uploaded onto the run), or failed.
 */
export async function answerDemoRun(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const staff = await requirePermission("demos:write");
  const parsed = parseForm(CompleteSchema, formData);
  if (!parsed.ok) return parsed.state;
  const { runId, outcome, note, summary } = parsed.data;

  const [run] = await db.select().from(demoRuns).where(eq(demoRuns.id, runId)).limit(1);
  if (!run) return fail("Exécution introuvable.");
  const [demo] = run.demoId ? await db.select().from(demos).where(eq(demos.id, run.demoId)).limit(1) : [];

  await db
    .update(demoRuns)
    .set({
      outcome,
      note: note || null,
      handledById: staff.id,
      result: summary ? { summary, fields: [], source: "manual" } : run.result,
      durationMs: outcome === "ok" ? Date.now() - run.createdAt.getTime() : run.durationMs,
      updatedAt: new Date(),
    })
    .where(eq(demoRuns.id, runId));

  await logActivity({
    actorId: staff.id,
    action: `demo.run_${outcome}`,
    entity: "demo_run",
    entityId: runId,
    meta: { demoId: run.demoId },
  });

  if (outcome !== "en_cours" || run.outcome !== "en_cours") {
    const href = demo ? `/dashboard/demos/${demo.slug}` : "/dashboard/demos";
    const title =
      outcome === "ok"
        ? `Résultat disponible${demo ? ` — ${demo.title}` : ""}`
        : outcome === "error"
          ? `Traitement impossible${demo ? ` — ${demo.title}` : ""}`
          : `Votre fichier est en cours de traitement${demo ? ` — ${demo.title}` : ""}`;
    await notify({
      userId: run.userId,
      type: "demo",
      title,
      body: note?.slice(0, 140),
      href,
      actorId: staff.id,
      entity: "demo",
      entityId: run.demoId ?? undefined,
    });
    if (outcome === "ok") {
      const recipient = await db.query.user.findFirst({
        where: (u, { eq: e }) => e(u.id, run.userId),
        columns: { email: true, name: true },
      });
      if (recipient) {
        await sendEmail({
          to: recipient.email,
          subject: title,
          text: `Bonjour ${recipient.name},\n\nLe traitement de votre fichier est terminé.${note ? `\n\n${note}` : ""}`,
          action: { label: "Voir le résultat", url: `${SITE_URL}${href}` },
        });
      }
    }
  }

  refresh(run.demoId ?? undefined, demo?.slug);
  return succeed(outcome === "ok" ? "Résultat envoyé au client." : "Exécution mise à jour.");
}

export async function deleteDemoRun(formData: FormData): Promise<void> {
  const staff = await requirePermission("demos:delete");
  const id = Number(formData.get("runId"));
  if (!Number.isInteger(id)) return;
  const files = await db.select({ key: attachments.key }).from(attachments).where(eq(attachments.demoRunId, id));
  const [run] = await db.delete(demoRuns).where(eq(demoRuns.id, id)).returning();
  if (!run) return;
  await Promise.all(files.map((f) => deleteObject(f.key).catch(() => {})));
  await logActivity({
    actorId: staff.id,
    action: "demo.run_deleted",
    entity: "demo_run",
    entityId: id,
    meta: { demoId: run.demoId, userId: run.userId },
  });
  refresh(run.demoId ?? undefined);
}
