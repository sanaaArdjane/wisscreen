"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { and, eq, isNull, ne, or } from "drizzle-orm";
import { db } from "@/lib/db";
import { requestMessages, requests } from "@/lib/db/schema";
import { requireUser } from "@/lib/guard";
import { logActivity, notify, notifyStaff, staffWith } from "@/lib/account";
import { publishMany } from "@/lib/realtime";
import { insertWithRef } from "@/lib/server/request-ref";
import { REQUEST_TYPES } from "@/lib/requests";
import { getSolutions } from "@/lib/content";
import { parseForm, fail, type ActionState } from "@/lib/actions";
import { sendEmail, adminEmail } from "@/lib/email";
import { SITE_URL } from "@/lib/site";
import { flash } from "@/lib/flash";

const NewRequestSchema = z.object({
  title: z.string().trim().min(4, "Donnez un titre d'au moins 4 caractères.").max(160),
  details: z.string().trim().min(20, "Décrivez votre besoin en quelques phrases.").max(5000),
  type: z.enum(REQUEST_TYPES),
  // `""` is what the select posts when nothing is chosen.
  serviceSlug: z
    .string()
    .transform((v) => (v === "" ? undefined : v))
    .optional(),
});

/** The solutions are edited in /admin/site, so membership is checked against the live
 *  list after parsing, not baked into the schema. */
async function isKnownSolution(slug: string | undefined): Promise<boolean> {
  if (!slug) return true;
  return (await getSolutions({ includeHidden: true })).some((s) => s.slug === slug);
}

export async function createRequest(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireUser();
  const parsed = parseForm(NewRequestSchema, formData);
  if (!parsed.ok) return parsed.state;
  if (!(await isKnownSolution(parsed.data.serviceSlug))) {
    return fail("Vérifiez les champs signalés.", { serviceSlug: "Solution inconnue." });
  }

  // Filing a demande is not metered. It used to spend a `requests.monthly`
  // quota, which capped how often a customer could ask SETYCORP for work —
  // the one thing an agency never wants to ration.
  const created = await insertWithRef({
    userId: user.id,
    title: parsed.data.title,
    details: parsed.data.details,
    type: parsed.data.type,
    serviceSlug: parsed.data.serviceSlug,
  });

  await logActivity({
    actorId: user.id,
    action: "request.created",
    entity: "request",
    entityId: created.id,
    meta: { ref: created.ref, type: created.type },
  });

  // The desk's bell. Before this, a new demande reached no one in-app — only
  // the one e-mail below, to one address.
  await notifyStaff("requests:read", {
    type: "request",
    title: `Nouvelle demande ${created.ref}`,
    body: `${user.name} — ${created.title}`,
    href: `/admin/demandes/${created.id}`,
    actorId: user.id,
    entity: "request",
    entityId: created.id,
  });

  await sendEmail({
    to: adminEmail(),
    subject: `Nouvelle demande ${created.ref} — ${user.name}`,
    text: `${user.name} (${user.email}) a déposé une demande.\n\n${created.title}\n\n${created.details}`,
    action: { label: "Ouvrir la demande", url: `${SITE_URL}/admin/demandes/${created.id}` },
  });

  await flash("Demande envoyée. Nous vous répondons sous 48 h ouvrées.");
  redirect(`/dashboard/demandes/${created.id}`);
}

const ReplySchema = z.object({
  requestId: z.coerce.number().int().positive(),
  body: z.string().trim().max(5000),
  /** Set by the composer when files ride along — then an empty body is fine. */
  withFiles: z.string().optional(),
});

export async function replyToRequest(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireUser();
  const parsed = parseForm(ReplySchema, formData);
  if (!parsed.ok) return parsed.state;

  // Scoped to this user's own rows — the id comes from a form field, so the
  // WHERE is the authorization, not a check that could be forgotten.
  const [request] = await db
    .select()
    .from(requests)
    .where(and(eq(requests.id, parsed.data.requestId), eq(requests.userId, user.id)))
    .limit(1);
  if (!request) return fail("Demande introuvable.");
  if (request.status === "terminee" || request.status === "refusee") {
    return fail("Cette demande est clôturée.");
  }
  const body = parsed.data.body || (parsed.data.withFiles ? "Pièce jointe" : "");
  if (!body) return fail("Écrivez un message.", { body: "Écrivez un message." });

  const [created] = await db
    .insert(requestMessages)
    .values({ requestId: request.id, authorId: user.id, body })
    .returning({ id: requestMessages.id });
  await db
    .update(requests)
    .set({ updatedAt: new Date() })
    .where(eq(requests.id, request.id));

  // The assignee if there is one, otherwise the whole desk. An unassigned
  // request's reply used to reach nobody in-app.
  const message = {
    type: "message",
    title: `Nouveau message sur ${request.ref}`,
    body: `${user.name} : ${body.slice(0, 140)}`,
    href: `/admin/demandes/${request.id}`,
    actorId: user.id,
    entity: "request",
    entityId: request.id,
  };
  if (request.assignedToId) {
    await notify({ userId: request.assignedToId, ...message });
  } else {
    await notifyStaff("requests:read", message);
  }

  await sendEmail({
    to: adminEmail(),
    subject: `Message client sur ${request.ref}`,
    text: `${user.name} a répondu sur « ${request.title} » :\n\n${body}`,
    action: { label: "Répondre", url: `${SITE_URL}/admin/demandes/${request.id}` },
  });

  revalidatePath(`/dashboard/demandes/${request.id}`);
  revalidatePath(`/admin/demandes/${request.id}`);
  // The composer uploads its files onto this message id next.
  return { ok: true, values: { messageId: String(created.id) } };
}

/**
 * The client opened the thread: everything the desk wrote there is now read.
 * Scoped by ownership in the WHERE. The desk's open tabs are nudged so their
 * "Lu" appears without a reload.
 */
export async function markThreadRead(requestId: number): Promise<void> {
  const user = await requireUser();
  const [request] = await db
    .select({ id: requests.id, assignedToId: requests.assignedToId })
    .from(requests)
    .where(and(eq(requests.id, requestId), eq(requests.userId, user.id)))
    .limit(1);
  if (!request) return;
  const marked = await db
    .update(requestMessages)
    .set({ readAt: new Date() })
    .where(
      and(
        eq(requestMessages.requestId, request.id),
        eq(requestMessages.internal, false),
        isNull(requestMessages.readAt),
        or(isNull(requestMessages.authorId), ne(requestMessages.authorId, user.id)),
      ),
    )
    .returning({ id: requestMessages.id });
  if (marked.length === 0) return;
  const staffIds = request.assignedToId ? [request.assignedToId] : await staffWith("requests:read");
  await publishMany(staffIds, { kind: "message", entity: "request", entityId: String(request.id) });
}

/** The client's own "close this, it's handled" — the only transition they own. */
export async function closeOwnRequest(formData: FormData): Promise<void> {
  const user = await requireUser();
  const id = Number(formData.get("requestId"));
  if (!Number.isInteger(id)) return;

  const [request] = await db
    .select()
    .from(requests)
    .where(and(eq(requests.id, id), eq(requests.userId, user.id)))
    .limit(1);
  if (!request || request.status === "terminee" || request.status === "refusee") return;

  await db
    .update(requests)
    .set({ status: "terminee", closedAt: new Date(), updatedAt: new Date() })
    .where(eq(requests.id, id));

  await logActivity({
    actorId: user.id,
    action: "request.closed_by_client",
    entity: "request",
    entityId: id,
    meta: { ref: request.ref },
  });

  const closed = {
    type: "request",
    title: `${request.ref} clôturée par le client`,
    body: request.title,
    href: `/admin/demandes/${id}`,
    actorId: user.id,
    entity: "request",
    entityId: id,
  };
  if (request.assignedToId) await notify({ userId: request.assignedToId, ...closed });
  else await notifyStaff("requests:read", closed);

  revalidatePath(`/dashboard/demandes/${id}`);
  revalidatePath("/dashboard/demandes");
  await flash("Demande clôturée.");
}
