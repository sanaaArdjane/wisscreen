"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { requestMessages, requests } from "@/lib/db/schema";
import { requirePermission } from "@/lib/guard";
import { logActivity, notify } from "@/lib/account";
import { canTransition, STATUS_LABELS, type RequestStatus } from "@/lib/requests";
import { checkbox, fail, parseForm, succeed, type ActionState } from "@/lib/actions";
import { sendEmail } from "@/lib/email";
import { SITE_URL } from "@/lib/site";
import { REQUEST_PRIORITIES } from "@/lib/requests";

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
    });
  }

  refresh(request.id);
  return succeed("Demande mise à jour.");
}

const StaffReplySchema = z.object({
  requestId: z.coerce.number().int().positive(),
  body: z.string().trim().min(1, "Écrivez un message.").max(5000),
  internal: checkbox,
});

export async function staffReply(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const staff = await requirePermission("requests:write");
  const parsed = parseForm(StaffReplySchema, formData);
  if (!parsed.ok) return parsed.state;

  const request = await loadRequest(parsed.data.requestId);
  if (!request) return fail("Demande introuvable.");

  await db.insert(requestMessages).values({
    requestId: request.id,
    authorId: staff.id,
    body: parsed.data.body,
    internal: parsed.data.internal,
  });
  await db.update(requests).set({ updatedAt: new Date() }).where(eq(requests.id, request.id));

  // An internal note reaches nobody outside the desk: no notification, no email.
  // This is the whole point of the flag, so it is checked before both.
  if (!parsed.data.internal) {
    await notify({
      userId: request.userId,
      type: "message",
      title: `Réponse sur votre demande ${request.ref}`,
      body: parsed.data.body.slice(0, 140),
      href: `/dashboard/demandes/${request.id}`,
    });

    const recipient = await db.query.user.findFirst({
      where: (u, { eq: e }) => e(u.id, request.userId),
      columns: { email: true, name: true },
    });
    if (recipient) {
      await sendEmail({
        to: recipient.email,
        subject: `Réponse à votre demande ${request.ref}`,
        text: `Bonjour ${recipient.name},\n\nNotre équipe vient de répondre sur « ${request.title} » :\n\n${parsed.data.body}`,
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

  refresh(request.id);
  return { ok: true };
}
