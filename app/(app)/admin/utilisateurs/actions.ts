"use server";

import { randomBytes } from "node:crypto";
import { z } from "zod";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { and, eq, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { quotas, user as userTable } from "@/lib/db/schema";
import { auth } from "@/lib/auth";
import { requirePermission } from "@/lib/guard";
import { logActivity, notify } from "@/lib/account";
import { isStandingMetric, nextPeriodReset } from "@/lib/quotas";
import { ALL_PERMISSIONS, ROLES, can, isRoleDefault, type PermissionKey } from "@/lib/permissions";
import { checkbox, fail, optionalText, parseForm, succeed, type ActionState } from "@/lib/actions";
import { sendEmail } from "@/lib/email";
import { SITE_URL } from "@/lib/site";

/**
 * Account administration.
 *
 * Three invariants are enforced here rather than in the UI, because the UI is a
 * suggestion and a server action is an endpoint:
 *
 *  1. **Nobody can act on their own account** through these — no self-suspension,
 *     no self-demotion, no self-deletion. Locking the only admin out of the
 *     platform is a support call nobody can answer from inside the product.
 *  2. **The last admin cannot be demoted, suspended or deleted.** Same reason,
 *     and it is a count query, not a comparison against a hardcoded email.
 *  3. **Only `team:write` may change roles or permissions.** `users:write` is
 *     enough to edit a profile or suspend a client; handing out capabilities is
 *     a different, higher power and has its own key.
 */

async function adminCount(): Promise<number> {
  const [row] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(userTable)
    // `is not true`, not `= false`: `banned` is nullable, and `NULL = false` is
    // NULL — an admin who has never been banned would not be counted, and the
    // "last admin" guard would let the real last admin be demoted.
    .where(and(eq(userTable.role, "admin"), sql`${userTable.banned} is not true`));
  return row?.n ?? 0;
}

async function isLastAdmin(userId: string): Promise<boolean> {
  const [target] = await db
    .select({ role: userTable.role, banned: userTable.banned })
    .from(userTable)
    .where(eq(userTable.id, userId))
    .limit(1);
  if (!target || target.role !== "admin" || target.banned) return false;
  return (await adminCount()) <= 1;
}

function refresh(userId: string) {
  revalidatePath(`/admin/utilisateurs/${userId}`);
  revalidatePath("/admin/utilisateurs");
  revalidatePath("/admin/equipe");
}

/* ───────────────────────────── Account creation ──────────────────────────── */

const CreateSchema = z.object({
  name: z.string().trim().min(2, "Nom requis.").max(120),
  email: z.string().trim().toLowerCase().email("Adresse e-mail invalide.").max(320),
  role: z.enum(ROLES),
  company: optionalText,
  phone: optionalText,
  password: z
    .string()
    .min(10, "10 caractères minimum.")
    .max(200)
    .optional()
    .or(z.literal("").transform(() => undefined)),
  sendInvite: checkbox,
});

/**
 * Creates an account from the back-office.
 *
 * The public `/inscription` form is for clients signing themselves up; a staff
 * member has no reason to be sent there, and an admin needs to be able to open
 * an account for a client who phoned in. This is that path.
 *
 * Two things it deliberately does:
 *
 *  - **`team:write` is required to create anything above a client.** `users:write`
 *    lets you open a client account; minting a colleague with back-office access
 *    is the higher power and has its own key, exactly as changing a role does.
 *  - **The password is generated when left blank**, and the generated one is
 *    returned in the success message *once*. It is never stored anywhere else and
 *    never e-mailed unless the invite box is ticked — an admin creating an account
 *    at a desk with the client on the phone needs to read it out, and an admin
 *    creating one in advance needs it sent.
 */
export async function createAccount(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const staff = await requirePermission("users:write");
  const parsed = parseForm(CreateSchema, formData);
  if (!parsed.ok) return parsed.state;

  if (parsed.data.role !== "user" && !can(staff, "team:write")) {
    return fail("Vous pouvez créer des comptes clients, mais pas de membre d'équipe.");
  }

  const [existing] = await db
    .select({ id: userTable.id })
    .from(userTable)
    .where(eq(userTable.email, parsed.data.email))
    .limit(1);
  if (existing) return fail("Un compte existe déjà avec cette adresse.");

  // 18 bytes of base64url — long enough that nobody is tempted to keep it, and
  // readable aloud over a phone.
  const generated = parsed.data.password ?? randomBytes(18).toString("base64url");

  let created;
  try {
    // Better Auth's own endpoint, not an INSERT: it hashes the password with the
    // same parameters sign-in verifies against, and creates the `account` row a
    // credential login needs. A hand-rolled row cannot sign in.
    created = await auth.api.createUser({
      body: {
        email: parsed.data.email,
        password: generated,
        name: parsed.data.name,
        // Always "user" here, then corrected below. The plugin's `role` is typed
        // to the roles *it* governs (`user` / `admin`) and `staff` is ours — the
        // column is the same one `changeRole` writes, and `can()` is what reads
        // it, so setting it directly is consistent rather than a workaround.
        role: "user",
        data: {
          company: parsed.data.company ?? null,
          phone: parsed.data.phone ?? null,
          // Created by a human who has verified who they are talking to.
          emailVerified: true,
        },
      },
      headers: await headers(),
    });
  } catch (error) {
    console.error("[admin] createUser failed", error);
    return fail("Création impossible. Vérifiez l'adresse et réessayez.");
  }

  const userId = created.user.id;

  if (parsed.data.role !== "user") {
    await db
      .update(userTable)
      .set({ role: parsed.data.role, updatedAt: new Date() })
      .where(eq(userTable.id, userId));
  }

  // No subscription is created here. A subscription is a service the customer
  // bought, provisioned from /admin/abonnements — an account is not a sale.

  await logActivity({
    actorId: staff.id,
    action: "user.created",
    entity: "user",
    entityId: userId,
    meta: { email: parsed.data.email, role: parsed.data.role, invited: parsed.data.sendInvite },
  });

  if (parsed.data.sendInvite) {
    await sendEmail({
      to: parsed.data.email,
      subject: "Votre accès WICLOUD",
      text: `Bonjour ${parsed.data.name},\n\nUn accès à la plateforme WICLOUD vient d'être créé pour vous.\n\nIdentifiant : ${parsed.data.email}\nMot de passe provisoire : ${generated}\n\nChangez-le depuis votre profil dès votre première connexion.`,
      action: { label: "Se connecter", url: `${SITE_URL}/connexion` },
    });
  }

  revalidatePath("/admin/utilisateurs");
  revalidatePath("/admin/equipe");

  return {
    ok: true,
    message: parsed.data.password
      ? `Compte créé pour ${parsed.data.email}.`
      : `Compte créé pour ${parsed.data.email}. Mot de passe provisoire : ${generated}${parsed.data.sendInvite ? " (également envoyé par e-mail)" : " — notez-le, il ne sera plus affiché."}`,
    // The new account's id, so the page can offer a link straight to its fiche.
    values: { createdId: userId },
  };
}

/* ─────────────────────────────── Suspension ─────────────────────────────── */

const SuspendSchema = z.object({
  userId: z.string().min(1),
  reason: optionalText,
});

export async function suspendUser(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const staff = await requirePermission("users:write");
  const parsed = parseForm(SuspendSchema, formData);
  if (!parsed.ok) return parsed.state;

  if (parsed.data.userId === staff.id) return fail("Vous ne pouvez pas suspendre votre propre compte.");
  if (await isLastAdmin(parsed.data.userId)) {
    return fail("Impossible : c'est le dernier administrateur actif de la plateforme.");
  }

  const reason = parsed.data.reason ?? "Compte suspendu par un administrateur";

  // Better Auth's own endpoint, not a raw UPDATE: it also revokes the account's
  // live sessions, so suspension takes effect on the next request rather than
  // whenever their cookie happens to expire.
  await auth.api.banUser({
    body: { userId: parsed.data.userId, banReason: reason },
    headers: await headers(),
  });

  await logActivity({
    actorId: staff.id,
    action: "user.suspended",
    entity: "user",
    entityId: parsed.data.userId,
    meta: { reason },
  });

  refresh(parsed.data.userId);
  return succeed("Compte suspendu et sessions révoquées.");
}

export async function unsuspendUser(formData: FormData): Promise<void> {
  const staff = await requirePermission("users:write");
  const userId = String(formData.get("userId") ?? "");
  if (!userId) return;

  await auth.api.unbanUser({ body: { userId }, headers: await headers() });
  await logActivity({
    actorId: staff.id,
    action: "user.unsuspended",
    entity: "user",
    entityId: userId,
  });
  refresh(userId);
}

/* ───────────────────────────── Profile & flags ───────────────────────────── */

const ProfileSchema = z.object({
  userId: z.string().min(1),
  name: z.string().trim().min(2, "Nom requis.").max(120),
  phone: optionalText,
  company: optionalText,
  adminNote: optionalText,
  magicLinkEnabled: checkbox,
});

export async function updateUser(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const staff = await requirePermission("users:write");
  const parsed = parseForm(ProfileSchema, formData);
  if (!parsed.ok) return parsed.state;

  await db
    .update(userTable)
    .set({
      name: parsed.data.name,
      phone: parsed.data.phone ?? null,
      company: parsed.data.company ?? null,
      adminNote: parsed.data.adminNote ?? null,
      magicLinkEnabled: parsed.data.magicLinkEnabled,
      updatedAt: new Date(),
    })
    .where(eq(userTable.id, parsed.data.userId));

  await logActivity({
    actorId: staff.id,
    action: "user.updated",
    entity: "user",
    entityId: parsed.data.userId,
  });

  refresh(parsed.data.userId);
  return succeed("Fiche mise à jour.");
}

/* ─────────────────────────── Roles & permissions ─────────────────────────── */

const RoleSchema = z.object({
  userId: z.string().min(1),
  role: z.enum(ROLES),
});

export async function changeRole(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const staff = await requirePermission("team:write");
  const parsed = parseForm(RoleSchema, formData);
  if (!parsed.ok) return parsed.state;

  if (parsed.data.userId === staff.id) return fail("Vous ne pouvez pas changer votre propre rôle.");
  if (parsed.data.role !== "admin" && (await isLastAdmin(parsed.data.userId))) {
    return fail("Impossible : c'est le dernier administrateur actif de la plateforme.");
  }

  await db
    .update(userTable)
    .set({ role: parsed.data.role, updatedAt: new Date() })
    .where(eq(userTable.id, parsed.data.userId));

  await logActivity({
    actorId: staff.id,
    action: "user.role_changed",
    entity: "user",
    entityId: parsed.data.userId,
    meta: { role: parsed.data.role },
  });

  await notify({
    userId: parsed.data.userId,
    title: "Votre rôle a changé",
    body: `Nouveau rôle : ${parsed.data.role}.`,
    href: "/dashboard/profil",
  });

  refresh(parsed.data.userId);
  return succeed("Rôle mis à jour.");
}

/**
 * The permission matrix.
 *
 * Every key is posted, ticked or not, so a submit is the complete state of the
 * matrix — an unchecked box that simply doesn't appear in `FormData` is why a
 * "revoke" would otherwise be indistinguishable from "left alone".
 *
 * Only *deviations* from the role's defaults are stored. A key the admin left at
 * its default is deleted from the override map rather than pinned, so promoting
 * someone later actually changes what they can do instead of being overruled by
 * a frozen snapshot.
 */
export async function updatePermissions(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const staff = await requirePermission("team:write");
  const userId = String(formData.get("userId") ?? "");
  if (!userId) return fail("Utilisateur manquant.");
  if (userId === staff.id) return fail("Vous ne pouvez pas modifier vos propres accès.");

  const [target] = await db
    .select({ role: userTable.role })
    .from(userTable)
    .where(eq(userTable.id, userId))
    .limit(1);
  if (!target) return fail("Utilisateur introuvable.");

  const overrides: Record<string, boolean> = {};
  for (const key of ALL_PERMISSIONS) {
    const granted = formData.get(key) === "on";
    if (granted !== isRoleDefault(target.role, key as PermissionKey)) {
      overrides[key] = granted;
    }
  }

  await db
    .update(userTable)
    .set({
      permissions: Object.keys(overrides).length ? overrides : null,
      updatedAt: new Date(),
    })
    .where(eq(userTable.id, userId));

  await logActivity({
    actorId: staff.id,
    action: "user.permissions_changed",
    entity: "user",
    entityId: userId,
    meta: { overrides },
  });

  refresh(userId);
  return succeed(
    Object.keys(overrides).length
      ? `${Object.keys(overrides).length} exception(s) enregistrée(s).`
      : "Accès alignés sur le rôle, sans exception.",
  );
}

/* ────────────────────────── Subscription & quotas ────────────────────────── */

const QuotaSchema = z.object({
  userId: z.string().min(1),
  metric: z.string().trim().min(1).max(64),
  // Empty means "unlimited" — a real choice, distinct from 0 ("not included").
  limit: z
    .string()
    .transform((v) => (v.trim() === "" ? null : Number(v)))
    .refine((v) => v === null || (Number.isInteger(v) && v >= 0), "Entier positif ou vide."),
  used: z.coerce.number().int().min(0),
});

export async function setQuota(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const staff = await requirePermission("subscriptions:write");
  const parsed = parseForm(QuotaSchema, formData);
  if (!parsed.ok) return parsed.state;

  await db
    .insert(quotas)
    .values({
      userId: parsed.data.userId,
      metric: parsed.data.metric,
      limit: parsed.data.limit,
      used: parsed.data.used,
      resetsAt: isStandingMetric(parsed.data.metric) ? null : nextPeriodReset(),
    })
    .onConflictDoUpdate({
      target: [quotas.userId, quotas.metric],
      set: { limit: parsed.data.limit, used: parsed.data.used, updatedAt: new Date() },
    });

  await logActivity({
    actorId: staff.id,
    action: "quota.set",
    entity: "user",
    entityId: parsed.data.userId,
    meta: { metric: parsed.data.metric, limit: parsed.data.limit, used: parsed.data.used },
  });

  refresh(parsed.data.userId);
  revalidatePath("/admin/abonnements");
  return succeed("Quota mis à jour.");
}

/** Remove a metric from an account — which makes it unlimited, per the quota rules. */
export async function deleteQuota(formData: FormData): Promise<void> {
  const staff = await requirePermission("subscriptions:delete");
  const userId = String(formData.get("userId") ?? "");
  const metric = String(formData.get("metric") ?? "");
  if (!userId || !metric) return;
  await db.delete(quotas).where(and(eq(quotas.userId, userId), eq(quotas.metric, metric)));
  await logActivity({
    actorId: staff.id,
    action: "quota.deleted",
    entity: "user",
    entityId: userId,
    meta: { metric },
  });
  refresh(userId);
  revalidatePath("/admin/abonnements");
}

/* ───────────────────────── Notifications & access ────────────────────────── */

const MessageSchema = z.object({
  userId: z.string().min(1),
  title: z.string().trim().min(3, "Un titre, même court.").max(160),
  body: z.string().trim().max(2000).optional(),
  alsoEmail: checkbox,
});

export async function messageUser(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const staff = await requirePermission("notifications:write");
  const parsed = parseForm(MessageSchema, formData);
  if (!parsed.ok) return parsed.state;

  const [target] = await db
    .select({ email: userTable.email, name: userTable.name })
    .from(userTable)
    .where(eq(userTable.id, parsed.data.userId))
    .limit(1);
  if (!target) return fail("Utilisateur introuvable.");

  await notify({
    userId: parsed.data.userId,
    title: parsed.data.title,
    body: parsed.data.body,
    href: "/dashboard/notifications",
  });

  if (parsed.data.alsoEmail) {
    await sendEmail({
      to: target.email,
      subject: parsed.data.title,
      text: parsed.data.body ?? parsed.data.title,
      action: { label: "Ouvrir mon espace", url: `${SITE_URL}/dashboard` },
    });
  }

  await logActivity({
    actorId: staff.id,
    action: "user.notified",
    entity: "user",
    entityId: parsed.data.userId,
    meta: { title: parsed.data.title, email: parsed.data.alsoEmail },
  });

  refresh(parsed.data.userId);
  return succeed("Notification envoyée.");
}

export async function impersonate(formData: FormData): Promise<void> {
  const staff = await requirePermission("users:write");
  const userId = String(formData.get("userId") ?? "");
  if (!userId || userId === staff.id) return;

  await auth.api.impersonateUser({ body: { userId }, headers: await headers() });
  await logActivity({
    actorId: staff.id,
    action: "user.impersonated",
    entity: "user",
    entityId: userId,
  });

  redirect("/dashboard");
}

const DeleteSchema = z.object({
  userId: z.string().min(1),
  confirm: z.string(),
});

export async function deleteUser(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const staff = await requirePermission("users:delete");
  const parsed = parseForm(DeleteSchema, formData);
  if (!parsed.ok) return parsed.state;

  const [target] = await db
    .select({ email: userTable.email, name: userTable.name })
    .from(userTable)
    .where(eq(userTable.id, parsed.data.userId))
    .limit(1);
  if (!target) return fail("Utilisateur introuvable.");

  // Typing the address is the confirmation. A "yes/no" dialog on an irreversible
  // cascade delete is not a decision anyone makes carefully at speed.
  if (parsed.data.confirm.trim().toLowerCase() !== target.email.toLowerCase()) {
    return fail("Saisissez l'adresse e-mail exacte du compte pour confirmer.");
  }
  if (parsed.data.userId === staff.id) return fail("Utilisez votre profil pour supprimer votre compte.");
  if (await isLastAdmin(parsed.data.userId)) {
    return fail("Impossible : c'est le dernier administrateur actif de la plateforme.");
  }

  await db.delete(userTable).where(eq(userTable.id, parsed.data.userId));

  await logActivity({
    actorId: staff.id,
    action: "user.deleted",
    entity: "user",
    entityId: parsed.data.userId,
    meta: { email: target.email, name: target.name },
  });

  revalidatePath("/admin/utilisateurs");
  redirect("/admin/utilisateurs");
}
