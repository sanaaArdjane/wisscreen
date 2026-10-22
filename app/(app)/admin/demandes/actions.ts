"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { and, eq, isNull } from "drizzle-orm";
import { db } from "@/lib/db";
import { demoAccess, demos, plans, requestMessages, requests, subscriptions, user as userTable } from "@/lib/db/schema";
import { requirePermission } from "@/lib/guard";
import { can } from "@/lib/permissions";
import { logActivity, notify, staffWith } from "@/lib/account";
import { publish, publishMany } from "@/lib/realtime";
import { canTransition, STATUS_LABELS, type RequestStatus } from "@/lib/requests";
import { checkbox, fail, parseForm, succeed, type ActionState } from "@/lib/actions";
import { sendEmail } from "@/lib/email";
import { SITE_URL } from "@/lib/site";
import { REQUEST_PRIORITIES } from "@/lib/requests";
import { parseMoneyToCents } from "@/lib/money";
import { insertWithRef } from "@/lib/server/request-ref";
import { getSolutions } from "@/lib/content";
import { REQUEST_TYPES } from "@/lib/requests";
import { flash } from "@/lib/flash";

/**
 * The desk's side of a request.
 *
 * Every action re-checks `requests:write` rather than trusting that the page
 * rendered the control — a server action is a public endpoint, and the only
 * thing standing between a revoked staff member and this code is the line at
 * the top of each function.
 */

async function loadRequest(id: number) {
  const [row] = await db.select().from(requests).where(eq(requests.id, id)).limit(1);
  return row ?? null;
}

function refresh(id: number) {
  revalidatePath(`/admin/demandes/${id}`);
  revalidatePath("/admin/demandes");
  revalidatePath(`/dashboard/demandes/${id}`);
  revalidatePath("/dashboard/demandes");
}

const StatusSchema = z.object({
  requestId: z.coerce.number().int().positive(),
  status: z.string(),
});

export async function changeStatus(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const staff = await requirePermission("requests:write");
  const parsed = parseForm(StatusSchema, formData);
  if (!parsed.ok) return parsed.state;

  const request = await loadRequest(parsed.data.requestId);
  if (!request) return fail("Demande introuvable.");

  // The transition table is the authority, not the form's options — a stale tab
  // can post "terminee" on a refused request, and this is what refuses it.
  if (!canTransition(request.status, parsed.data.status)) {
    return fail(
      `Transition impossible : « ${STATUS_LABELS[request.status as RequestStatus] ?? request.status} » ne peut pas devenir « ${STATUS_LABELS[parsed.data.status as RequestStatus] ?? parsed.data.status} ».`,
    );
  }

  const status = parsed.data.status as RequestStatus;
  const closing = status === "terminee" || status === "refusee";

  await db
    .update(requests)
    .set({
      status,
      updatedAt: new Date(),
      closedAt: closing ? new Date() : null,
    })
    .where(eq(requests.id, request.id));

  await logActivity({
    actorId: staff.id,
    action: "request.status_changed",
    entity: "request",
    entityId: request.id,
    meta: { ref: request.ref, from: request.status, to: status },
  });

  await notify({
    userId: request.userId,
    type: "request",
    title: `Votre demande ${request.ref} est ${STATUS_LABELS[status].toLowerCase()}`,
    body: request.title,
    href: `/dashboard/demandes/${request.id}`,
    actorId: staff.id,
    entity: "request",
    entityId: request.id,
  });

  refresh(request.id);
  return succeed(`Statut mis à jour : ${STATUS_LABELS[status]}.`);
}

const AssignSchema = z.object({
  requestId: z.coerce.number().int().positive(),
  // `""` means "unassign", which is a real choice and not an empty submission.
  assigneeId: z.string(),
  priority: z.enum(REQUEST_PRIORITIES),
});

export async function assignRequest(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const staff = await requirePermission("requests:write");
  const parsed = parseForm(AssignSchema, formData);
  if (!parsed.ok) return parsed.state;

  const request = await loadRequest(parsed.data.requestId);
  if (!request) return fail("Demande introuvable.");

  const assignedToId = parsed.data.assigneeId || null;

  await db
    .update(requests)
    .set({ assignedToId, priority: parsed.data.priority, updatedAt: new Date() })
    .where(eq(requests.id, request.id));

  await logActivity({
    actorId: staff.id,
    action: "request.assigned",
    entity: "request",
    entityId: request.id,
    meta: { ref: request.ref, assignedToId, priority: parsed.data.priority },
  });

  // Notify the assignee — unless they assigned it to themselves, in which case
  // telling them about it is noise.
  if (assignedToId && assignedToId !== staff.id) {
    await notify({
      userId: assignedToId,
      type: "request",
      title: `Demande ${request.ref} vous a été attribuée`,
      body: request.title,
      href: `/admin/demandes/${request.id}`,
      actorId: staff.id,
      entity: "request",
      entityId: request.id,
    });
  }

  refresh(request.id);
  return succeed("Demande mise à jour.");
}

const StaffReplySchema = z.object({
  requestId: z.coerce.number().int().positive(),
  body: z.string().trim().max(5000),
  internal: checkbox,
  withFiles: z.string().optional(),
});

export async function staffReply(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const staff = await requirePermission("requests:write");
  const parsed = parseForm(StaffReplySchema, formData);
  if (!parsed.ok) return parsed.state;

  const request = await loadRequest(parsed.data.requestId);
  if (!request) return fail("Demande introuvable.");

  const body = parsed.data.body || (parsed.data.withFiles ? "Pièce jointe" : "");
  if (!body) return fail("Écrivez un message.", { body: "Écrivez un message." });

  const [created] = await db
    .insert(requestMessages)
    .values({ requestId: request.id, authorId: staff.id, body, internal: parsed.data.internal })
    .returning({ id: requestMessages.id });
  await db.update(requests).set({ updatedAt: new Date() }).where(eq(requests.id, request.id));

  // An internal note reaches nobody outside the desk: no notification, no email.
  // This is the whole point of the flag, so it is checked before both.
  if (!parsed.data.internal) {
    await notify({
      userId: request.userId,
      type: "message",
      title: `Réponse sur votre demande ${request.ref}`,
      body: body.slice(0, 140),
      href: `/dashboard/demandes/${request.id}`,
      actorId: staff.id,
      entity: "request",
      entityId: request.id,
    });

    const recipient = await db.query.user.findFirst({
      where: (u, { eq: e }) => e(u.id, request.userId),
      columns: { email: true, name: true },
    });
    if (recipient) {
      await sendEmail({
        to: recipient.email,
        subject: `Réponse à votre demande ${request.ref}`,
        text: `Bonjour ${recipient.name},\n\nNotre équipe vient de répondre sur « ${request.title} » :\n\n${body}`,
        action: {
          label: "Voir la demande",
          url: `${SITE_URL}/dashboard/demandes/${request.id}`,
        },
      });
    }
  }

  await logActivity({
    actorId: staff.id,
    action: parsed.data.internal ? "request.internal_note" : "request.replied",
    entity: "request",
    entityId: request.id,
    meta: { ref: request.ref },
  });

  // An internal note notifies nobody, but colleagues with the thread open
  // should still see it appear.
  if (parsed.data.internal) {
    const desk = await staffWith("requests:read", staff.id);
    await publishMany(desk, { kind: "message", entity: "request", entityId: String(request.id) });
  }

  refresh(request.id);
  return { ok: true, values: { messageId: String(created.id) } };
}

/** The desk opened the thread: the client's messages are now read. */
export async function markThreadReadByStaff(requestId: number): Promise<void> {
  await requirePermission("requests:read");
  const request = await loadRequest(requestId);
  if (!request) return;
  const marked = await db
    .update(requestMessages)
    .set({ readAt: new Date() })
    .where(
      and(
        eq(requestMessages.requestId, request.id),
        eq(requestMessages.authorId, request.userId),
        isNull(requestMessages.readAt),
      ),
    )
    .returning({ id: requestMessages.id });
  if (marked.length > 0) {
    await publish(request.userId, { kind: "message", entity: "request", entityId: String(request.id) });
  }
}

const EditSchema = z.object({
  requestId: z.coerce.number().int().positive(),
  title: z.string().trim().min(4, "Au moins 4 caractères.").max(160),
  details: z.string().trim().min(1, "Requis.").max(5000),
  // Budget is typed in the currency's units and stored in cents; "" clears it.
  budget: z
    .string()
    .trim()
    .transform((v) => (v === "" ? null : (parseMoneyToCents(v) ?? -1)))
    .refine((v) => v === null || v >= 0, "Montant invalide."),
});

/**
 * Correct what the client filed — a typo in the title, details added over the
 * phone, a budget agreed on a call. The client is not notified: this is the
 * desk tidying its own record, not a change to what was agreed.
 */
export async function updateRequest(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const staff = await requirePermission("requests:write");
  const parsed = parseForm(EditSchema, formData);
  if (!parsed.ok) return parsed.state;

  const request = await loadRequest(parsed.data.requestId);
  if (!request) return fail("Demande introuvable.");

  await db
    .update(requests)
    .set({
      title: parsed.data.title,
      details: parsed.data.details,
      budgetCents: parsed.data.budget,
      updatedAt: new Date(),
    })
    .where(eq(requests.id, request.id));

  await logActivity({
    actorId: staff.id,
    action: "request.edited",
    entity: "request",
    entityId: request.id,
    meta: { ref: request.ref },
  });

  refresh(request.id);
  return succeed("Demande modifiée.");
}

/**
 * Delete a demande and, by cascade, its thread and its attachments' rows.
 *
 * Quotes and subscriptions that pointed at it survive with `request_id` set to
 * null — a quote the client accepted is still a quote they accepted. The
 * objects in the bucket are left behind; they are unreachable without a row,
 * and a bucket sweep is cheaper than a partial failure halfway through a loop.
 */
export async function deleteRequest(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const staff = await requirePermission("requests:delete");
  const id = Number(formData.get("requestId"));
  if (!Number.isInteger(id)) return fail("Demande introuvable.");

  const request = await loadRequest(id);
  if (!request) return fail("Demande introuvable.");
  if (String(formData.get("confirm") ?? "").trim() !== request.ref) {
    return fail(`Saisissez exactement « ${request.ref} » pour confirmer.`);
  }

  await db.delete(requests).where(eq(requests.id, id));
  await logActivity({
    actorId: staff.id,
    action: "request.deleted",
    entity: "request",
    entityId: id,
    meta: { ref: request.ref, title: request.title, userId: request.userId },
  });

  revalidatePath("/admin/demandes");
  revalidatePath("/dashboard/demandes");
  await flash("Demande supprimée.");
  redirect("/admin/demandes");
}

/* ───────────────────── A demande opened by the desk ───────────────────── */

const ForClientSchema = z.object({
  userId: z.string().min(1, "Choisissez un client."),
  title: z.string().trim().min(4, "Donnez un titre d'au moins 4 caractères.").max(160),
  details: z.string().trim().min(10, "Décrivez la proposition en quelques mots.").max(5000),
  type: z.enum(REQUEST_TYPES),
  serviceSlug: z
    .string()
    .transform((v) => (v === "" ? undefined : v))
    .optional(),
  priority: z.enum(REQUEST_PRIORITIES),
  /** Optional extras handed over with the message. */
  demoId: z.coerce.number().int().positive().optional().or(z.literal("").transform(() => undefined)),
  planSlug: z
    .string()
    .transform((v) => (v === "" ? undefined : v))
    .optional(),
});

/**
 * The reverse of a customer's demande: the desk proposes a demo, a service or a
 * consultation to a named customer. It is an ordinary request owned by the
 * customer (so it shows in their space and carries the same thread), assigned to
 * the staff member who opened it, with their text as the first message so the
 * thread reads as team-initiated.
 */
export async function createRequestForClient(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const staff = await requirePermission("requests:write");
  const parsed = parseForm(ForClientSchema, formData);
  if (!parsed.ok) return parsed.state;
  const d = parsed.data;

  const [client] = await db.select().from(userTable).where(eq(userTable.id, d.userId)).limit(1);
  if (!client) return fail("Vérifiez les champs signalés.", { userId: "Client introuvable." });
  if (d.serviceSlug && !(await getSolutions({ includeHidden: true })).some((s) => s.slug === d.serviceSlug)) {
    return fail("Vérifiez les champs signalés.", { serviceSlug: "Solution inconnue." });
  }

  // The extras need their own permission, and are checked before anything is written
  // so a refused one cannot leave a half-built demande behind.
  let demo: typeof demos.$inferSelect | undefined;
  if (d.demoId) {
    if (!can(staff, "demos:write")) return fail("Vous ne pouvez pas attribuer de démo.", { demoId: "Non autorisé." });
    [demo] = await db.select().from(demos).where(eq(demos.id, d.demoId)).limit(1);
    if (!demo) return fail("Vérifiez les champs signalés.", { demoId: "Démo introuvable." });
  }
  let plan: typeof plans.$inferSelect | undefined;
  if (d.planSlug) {
    if (!can(staff, "subscriptions:write")) return fail("Vous ne pouvez pas provisionner de service.", { planSlug: "Non autorisé." });
    [plan] = await db.select().from(plans).where(eq(plans.slug, d.planSlug)).limit(1);
    if (!plan) return fail("Vérifiez les champs signalés.", { planSlug: "Offre introuvable." });
  }

  const created = await insertWithRef({
    userId: client.id,
    title: d.title,
    details: d.details,
    type: d.type,
    serviceSlug: d.serviceSlug,
    priority: d.priority,
    assignedToId: staff.id,
  });

  if (demo) {
    await db
      .insert(demoAccess)
      .values({ demoId: demo.id, userId: client.id, grantedById: staff.id, note: `Demande ${created.ref}` })
      .onConflictDoUpdate({
        target: [demoAccess.demoId, demoAccess.userId],
        set: { revokedAt: null, grantedById: staff.id, note: `Demande ${created.ref}` },
      });
    await logActivity({
      actorId: staff.id,
      action: "demo.access_granted",
      entity: "demo",
      entityId: demo.id,
      meta: { userIds: [client.id], requestId: created.id },
    });
  }
  if (plan) {
    // A pending service, priced from the catalogue; the desk moves it forward from the
    // service page. Quotas are not granted here — that stays an explicit choice there.
    const [sub] = await db
      .insert(subscriptions)
      .values({
        userId: client.id,
        planSlug: plan.slug,
        label: plan.name,
        requestId: created.id,
        priceCents: plan.priceCents,
        currency: plan.currency,
        billingPeriod: plan.billingPeriod,
        resourceSpec: plan.specs ?? {},
        status: "pending",
      })
      .returning({ id: subscriptions.id });
    await logActivity({
      actorId: staff.id,
      action: "subscription.provisioned",
      entity: "subscription",
      entityId: sub.id,
      meta: { userId: client.id, planSlug: plan.slug, status: "pending", requestId: created.id },
    });
    revalidatePath("/admin/abonnements");
    revalidatePath("/dashboard/abonnement");
  }
  await db.insert(requestMessages).values({ requestId: created.id, authorId: staff.id, body: d.details });

  await logActivity({
    actorId: staff.id,
    action: "request.created_for_client",
    entity: "request",
    entityId: created.id,
    meta: { ref: created.ref, type: created.type, userId: client.id },
  });
  await notify({
    userId: client.id,
    type: "request",
    title: `Une proposition de SETYCORP : ${created.title}`,
    body: [
      d.details.slice(0, 200),
      demo ? `Démo attribuée : ${demo.title}.` : "",
      plan ? `Service proposé : ${plan.name}.` : "",
    ]
      .filter(Boolean)
      .join(" "),
    href: `/dashboard/demandes/${created.id}`,
    actorId: staff.id,
    entity: "request",
    entityId: created.id,
  });
  await sendEmail({
    to: client.email,
    subject: `${created.title} — ${created.ref}`,
    text: `${d.details}${demo ? `\n\nDémo mise à votre disposition : ${demo.title}.` : ""}${plan ? `\n\nService proposé : ${plan.name}.` : ""}\n\nVous pouvez répondre directement depuis votre espace.`,
    action: { label: "Ouvrir la demande", url: `${SITE_URL}/dashboard/demandes/${created.id}` },
  });

  refresh(created.id);
  await flash("Demande envoyée au client.");
  redirect(`/admin/demandes/${created.id}`);
}
