import { asc, eq, ne } from "drizzle-orm";
import { db } from "@/lib/db";
import { plans, user as userTable } from "@/lib/db/schema";
import { formatLines } from "@/lib/kv";

/** Clients and catalogue entries for the service form. Server-only reads. */
export async function serviceFormOptions() {
  const [clients, catalogue] = await Promise.all([
    db
      .select({ id: userTable.id, name: userTable.name, email: userTable.email })
      .from(userTable)
      .where(ne(userTable.role, "staff"))
      .orderBy(asc(userTable.name)),
    db.select().from(plans).where(eq(plans.active, true)).orderBy(asc(plans.sortOrder)),
  ]);
  return {
    clients: clients.map((c) => ({ value: c.id, label: `${c.name} — ${c.email}` })),
    plansList: catalogue.map((p) => ({
      value: p.slug,
      label: p.name,
      grants: formatLines(p.defaultQuotas).replaceAll("\n", ", "),
      period: p.billingPeriod,
      price: p.priceCents === null ? "" : String(p.priceCents / 100),
      currency: p.currency,
    })),
  };
}
