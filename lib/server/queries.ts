import { and, desc, eq, isNull, or, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  attachments,
  contactLeads,
  demoRuns,
  invoices,
  quotes,
  requestMessages,
  requests,
  user,
} from "@/lib/db/schema";

/**
 * Read queries shared between pages.
 *
 * Plain module, **not** `"use server"`: a file with that directive turns every
 * export into a client-callable endpoint, so `listRequests(userId)` sitting in
 * one would let anyone fetch anyone's rows by passing a different id. Reads live
 * here; only mutations go in an `actions.ts`.
 */

export async function listRequests(userId: string, limit?: number) {
  const q = db
    .select()
    .from(requests)
    .where(eq(requests.userId, userId))
    .orderBy(desc(requests.updatedAt));
  return limit ? q.limit(limit) : q;
}

export async function getOwnRequest(userId: string, id: number) {
  const [row] = await db
    .select()
    .from(requests)
    .where(and(eq(requests.id, id), eq(requests.userId, userId)))
    .limit(1);
  return row ?? null;
}

export async function getRequestById(id: number) {
  const [row] = await db
    .select({ request: requests, client: user })
    .from(requests)
    .innerJoin(user, eq(user.id, requests.userId))
    .where(eq(requests.id, id))
    .limit(1);
  return row ?? null;
}

/**
 * The thread. `includeInternal` is the caller's decision and defaults to false,
 * so a client-facing page that forgets to pass it gets the safe answer rather
 * than staff notes.
 */
export async function listMessages(requestId: number, includeInternal = false) {
  return db
    .select({ message: requestMessages, author: user })
    .from(requestMessages)
    .leftJoin(user, eq(user.id, requestMessages.authorId))
    .where(
      includeInternal
        ? eq(requestMessages.requestId, requestId)
        : and(eq(requestMessages.requestId, requestId), eq(requestMessages.internal, false)),
    )
    .orderBy(requestMessages.createdAt);
}

export async function listAttachments(requestId: number, includeInternal = false) {
  return db
    .select()
    .from(attachments)
    .where(
      includeInternal
        ? eq(attachments.requestId, requestId)
        : and(eq(attachments.requestId, requestId), eq(attachments.internal, false)),
    )
    .orderBy(desc(attachments.createdAt));
}

export async function listOwnDocuments(userId: string) {
  return db
    .select({ attachment: attachments, request: requests })
    .from(attachments)
    .leftJoin(requests, eq(requests.id, attachments.requestId))
    .where(and(eq(attachments.ownerId, userId), eq(attachments.internal, false)))
    .orderBy(desc(attachments.createdAt));
}

export async function listQuotes(userId?: string) {
  const q = db
    .select({ quote: quotes, client: user })
    .from(quotes)
    .innerJoin(user, eq(user.id, quotes.userId))
    .orderBy(desc(quotes.createdAt));
  // A client only ever sees a quote that has actually been sent — a draft the
  // desk is still editing is not a document anyone should be reacting to.
  return userId
    ? q.where(and(eq(quotes.userId, userId), sql`${quotes.status} <> 'brouillon'`))
    : q;
}

export async function listInvoices(userId?: string) {
  const q = db
    .select({ invoice: invoices, client: user })
    .from(invoices)
    .innerJoin(user, eq(user.id, invoices.userId))
    .orderBy(desc(invoices.createdAt));
  return userId
    ? q.where(and(eq(invoices.userId, userId), sql`${invoices.status} <> 'brouillon'`))
    : q;
}

export async function listDemoRuns(userId?: string, limit = 50) {
  const q = db
    .select({ run: demoRuns, client: user })
    .from(demoRuns)
    .innerJoin(user, eq(user.id, demoRuns.userId))
    .orderBy(desc(demoRuns.createdAt))
    .limit(limit);
  return userId ? q.where(eq(demoRuns.userId, userId)) : q;
}

export async function listLeads(status?: string) {
  const q = db.select().from(contactLeads).orderBy(desc(contactLeads.createdAt));
  return status ? q.where(eq(contactLeads.status, status)) : q;
}

/** Staff who can be assigned a request: anyone above a plain client account. */
export async function listAssignees() {
  return db
    .select({ id: user.id, name: user.name, email: user.email, role: user.role })
    .from(user)
    .where(or(eq(user.role, "admin"), eq(user.role, "staff")))
    .orderBy(user.name);
}

/** Counts for the admin overview, in one round trip rather than six. */
export async function adminCounters() {
  const [row] = await db
    .select({
      openRequests: sql<number>`count(*) filter (where ${requests.status} in ('nouvelle','en_cours'))::int`,
      newRequests: sql<number>`count(*) filter (where ${requests.status} = 'nouvelle')::int`,
      unassigned: sql<number>`count(*) filter (where ${requests.assignedToId} is null and ${requests.status} in ('nouvelle','en_cours'))::int`,
      total: sql<number>`count(*)::int`,
    })
    .from(requests);

  const [money] = await db
    .select({
      unpaid: sql<number>`coalesce(sum(${invoices.amountCents}) filter (where ${invoices.status} in ('envoyee','en_retard')), 0)::int`,
      unpaidCount: sql<number>`count(*) filter (where ${invoices.status} in ('envoyee','en_retard'))::int`,
      paid: sql<number>`coalesce(sum(${invoices.amountCents}) filter (where ${invoices.status} = 'payee'), 0)::int`,
    })
    .from(invoices);

  const [people] = await db
    .select({
      users: sql<number>`count(*)::int`,
      suspended: sql<number>`count(*) filter (where ${user.banned})::int`,
      staff: sql<number>`count(*) filter (where ${user.role} in ('admin','staff'))::int`,
    })
    .from(user);

  const [leads] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(contactLeads)
    .where(eq(contactLeads.status, "nouveau"));

  const [pendingQuotes] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(quotes)
    .where(eq(quotes.status, "envoye"));

  return {
    ...row,
    ...money,
    ...people,
    newLeads: leads?.n ?? 0,
    pendingQuotes: pendingQuotes?.n ?? 0,
  };
}

/** Counts for the client overview. */
export async function clientCounters(userId: string) {
  const [req] = await db
    .select({
      open: sql<number>`count(*) filter (where ${requests.status} in ('nouvelle','en_cours','acceptee'))::int`,
      total: sql<number>`count(*)::int`,
    })
    .from(requests)
    .where(eq(requests.userId, userId));

  const [quote] = await db
    .select({ pending: sql<number>`count(*) filter (where ${quotes.status} = 'envoye')::int` })
    .from(quotes)
    .where(eq(quotes.userId, userId));

  const [invoice] = await db
    .select({
      unpaid: sql<number>`count(*) filter (where ${invoices.status} in ('envoyee','en_retard'))::int`,
      unpaidCents: sql<number>`coalesce(sum(${invoices.amountCents}) filter (where ${invoices.status} in ('envoyee','en_retard')), 0)::int`,
    })
    .from(invoices)
    .where(eq(invoices.userId, userId));

  const [docs] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(attachments)
    .where(and(eq(attachments.ownerId, userId), eq(attachments.internal, false)));

  return {
    openRequests: req?.open ?? 0,
    totalRequests: req?.total ?? 0,
    pendingQuotes: quote?.pending ?? 0,
    unpaidInvoices: invoice?.unpaid ?? 0,
    unpaidCents: invoice?.unpaidCents ?? 0,
    documents: docs?.n ?? 0,
  };
}

/** Requests nobody has answered yet, for the admin queue's default view. */
export async function openRequestsQueue(limit = 8) {
  return db
    .select({ request: requests, client: user })
    .from(requests)
    .innerJoin(user, eq(user.id, requests.userId))
    .where(or(eq(requests.status, "nouvelle"), eq(requests.status, "en_cours")))
    .orderBy(desc(requests.createdAt))
    .limit(limit);
}

export async function unreadLeadCount() {
  const [row] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(contactLeads)
    .where(and(eq(contactLeads.status, "nouveau"), isNull(contactLeads.userId)));
  return row?.n ?? 0;
}
