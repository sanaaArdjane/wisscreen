import { like } from "drizzle-orm";
import { db } from "@/lib/db";
import { requests } from "@/lib/db/schema";
import { nextRef, refPeriod } from "@/lib/ref";

/**
 * Allocates the next `WC-YYMM-NNNN` and inserts, retrying on the unique index.
 *
 * Two people submitting in the same second can compute the same sequence — the
 * index is what makes that safe, and this loop is what makes it invisible. Three
 * attempts is plenty: each retry re-reads the max, so a collision only repeats
 * if a third request lands inside the same window.
 *
 * Shared by the customer's form and the desk's "demande pour un client".
 */
export async function insertWithRef(
  values: Omit<typeof requests.$inferInsert, "ref">,
): Promise<typeof requests.$inferSelect> {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const existing = await db
      .select({ ref: requests.ref })
      .from(requests)
      .where(like(requests.ref, `WC-${refPeriod()}-%`));
    const ref = nextRef(
      "WC",
      existing.map((r) => r.ref),
    );
    try {
      const [row] = await db
        .insert(requests)
        .values({ ...values, ref })
        .returning();
      return row;
    } catch (err) {
      const isDuplicate =
        typeof err === "object" && err !== null && "code" in err && err.code === "23505";
      if (!isDuplicate || attempt === 2) throw err;
    }
  }
  throw new Error("unreachable");
}
