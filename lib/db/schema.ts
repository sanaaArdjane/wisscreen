import {
  pgTable,
  text,
  timestamp,
  boolean,
  integer,
  jsonb,
  uniqueIndex,
  index,
  serial,
} from "drizzle-orm/pg-core";

/**
 * The whole WICLOUD platform schema — Better Auth's four core tables plus the
 * dashboard's own.
 *
 * Better Auth owns `user` / `session` / `account` / `verification`: their column
 * names are fixed by the adapter (camelCase in TS, snake_case in Postgres) and
 * the admin plugin adds `role` / `banned` / `banReason` / `banExpires` to `user`
 * and `impersonatedBy` to `session`. Don't rename those. Everything *after* the
 * `permissions`/`magicLinkEnabled` marker on `user` is ours, declared through
 * Better Auth's `user.additionalFields` in `lib/auth.ts` so it stays in sync.
 *
 * Money is stored as integer **cents** (`amountCents`) — never a float, and never
 * a Postgres `numeric` that comes back as a string and then gets `parseFloat`ed
 * somewhere. Currency is a separate column so the number is never ambiguous.
 */

/* ─────────────────────────── Better Auth core ─────────────────────────── */

export const user = pgTable(
  "user",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    email: text("email").notNull().unique(),
    emailVerified: boolean("email_verified")
      .$defaultFn(() => false)
      .notNull(),
    image: text("image"),
    createdAt: timestamp("created_at")
      .$defaultFn(() => new Date())
      .notNull(),
    updatedAt: timestamp("updated_at")
      .$defaultFn(() => new Date())
      .notNull(),

    // admin plugin
    role: text("role").default("user").notNull(),
    banned: boolean("banned").default(false),
    banReason: text("ban_reason"),
    banExpires: timestamp("ban_expires"),

    // ── ours, from here down ──
    /** Per-user access overrides, e.g. `{ "invoices:write": false, "leads:read": true }`.
     *  Layered over the role's defaults by `can()` in `lib/permissions.ts`; this is what
     *  lets the admin grant or revoke one capability without inventing a new role. */
    permissions: jsonb("permissions").$type<Record<string, boolean>>(),
    /** Whether this account may sign in with a magic link. Also gated globally by
     *  the `magicLinkEnabled` app setting — both have to be on. */
    magicLinkEnabled: boolean("magic_link_enabled").default(false).notNull(),
    phone: text("phone"),
    company: text("company"),
    /** Free-text note only staff can see, shown on the admin user detail page. */
    adminNote: text("admin_note"),
    lastSeenAt: timestamp("last_seen_at"),
  },
  (t) => [index("user_role_idx").on(t.role)],
);

export const session = pgTable("session", {
  id: text("id").primaryKey(),
  expiresAt: timestamp("expires_at").notNull(),
  token: text("token").notNull().unique(),
  createdAt: timestamp("created_at").notNull(),
  updatedAt: timestamp("updated_at").notNull(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  impersonatedBy: text("impersonated_by"),
});

export const account = pgTable("account", {
  id: text("id").primaryKey(),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  idToken: text("id_token"),
  accessTokenExpiresAt: timestamp("access_token_expires_at"),
  refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
  scope: text("scope"),
  password: text("password"),
  createdAt: timestamp("created_at").notNull(),
  updatedAt: timestamp("updated_at").notNull(),
});

export const verification = pgTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").$defaultFn(() => new Date()),
  updatedAt: timestamp("updated_at").$defaultFn(() => new Date()),
});

/* ───────────────────────── Plans, subscriptions, quotas ───────────────────────── */

export const plans = pgTable("plans", {
  slug: text("slug").primaryKey(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  /** Monthly price in cents; 0 for the free tier, null for "nous consulter". */
  priceCents: integer("price_cents"),
  currency: text("currency").default("DZD").notNull(),
  features: jsonb("features").$type<string[]>().default([]).notNull(),
  /** Default allowances copied into `quotas` when a subscription is created:
   *  `{ "requests.monthly": 5, "demo.runs": 20, "storage.mb": 500 }`.
   *  A metric absent here is unlimited; a value of 0 means "not included". */
  defaultQuotas: jsonb("default_quotas").$type<Record<string, number>>().default({}).notNull(),
  sortOrder: integer("sort_order").default(0).notNull(),
  active: boolean("active").default(true).notNull(),
});

export const subscriptions = pgTable(
  "subscriptions",
  {
    id: serial("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    planSlug: text("plan_slug")
      .notNull()
      .references(() => plans.slug),
    /** `active` | `trialing` | `past_due` | `paused` | `cancelled` */
    status: text("status").default("active").notNull(),
    periodStart: timestamp("period_start").defaultNow().notNull(),
    periodEnd: timestamp("period_end"),
    cancelAtPeriodEnd: boolean("cancel_at_period_end").default(false).notNull(),
    note: text("note"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  // One live subscription per user. History is in `activity_log`, not here —
  // this table answers "what is this account entitled to right now".
  (t) => [uniqueIndex("subscriptions_user_key").on(t.userId)],
);

export const quotas = pgTable(
  "quotas",
  {
    id: serial("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    /** e.g. `requests.monthly`, `demo.runs`, `storage.mb` */
    metric: text("metric").notNull(),
    /** null = unlimited. 0 = not included in the plan. */
    limit: integer("limit"),
    used: integer("used").default(0).notNull(),
    /** When `used` resets to 0. null = never (a lifetime allowance). */
    resetsAt: timestamp("resets_at"),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => [uniqueIndex("quotas_user_metric_key").on(t.userId, t.metric)],
);

/* ───────────────────────────── Requests & threads ───────────────────────────── */

export const requests = pgTable(
  "requests",
  {
    id: serial("id").primaryKey(),
    /** Human-facing code, `WC-YYMM-NNNN`. Generated in `lib/ref.ts`. */
    ref: text("ref").notNull().unique(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    /** A `Service.slug` from `lib/data/services.ts`, or null for a general request. */
    serviceSlug: text("service_slug"),
    /** `service` | `demo` | `devis` | `support` */
    type: text("type").default("service").notNull(),
    title: text("title").notNull(),
    details: text("details").notNull(),
    /** `nouvelle` | `en_cours` | `acceptee` | `refusee` | `terminee` — transitions
     *  are guarded by `nextStatuses()` in `lib/requests.ts`, not by free assignment. */
    status: text("status").default("nouvelle").notNull(),
    /** `basse` | `normale` | `haute` | `urgente` */
    priority: text("priority").default("normale").notNull(),
    assignedToId: text("assigned_to_id").references(() => user.id, { onDelete: "set null" }),
    budgetCents: integer("budget_cents"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
    closedAt: timestamp("closed_at"),
  },
  (t) => [
    index("requests_user_idx").on(t.userId),
    index("requests_status_idx").on(t.status),
  ],
);

export const requestMessages = pgTable(
  "request_messages",
  {
    id: serial("id").primaryKey(),
    requestId: integer("request_id")
      .notNull()
      .references(() => requests.id, { onDelete: "cascade" }),
    authorId: text("author_id").references(() => user.id, { onDelete: "set null" }),
    body: text("body").notNull(),
    /** A staff-only note. Never sent to the client and never rendered in /dashboard. */
    internal: boolean("internal").default(false).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [index("request_messages_request_idx").on(t.requestId)],
);

export const attachments = pgTable(
  "attachments",
  {
    id: serial("id").primaryKey(),
    /** Object key in the Neon `documents` bucket. Never a URL — reads are presigned
     *  on demand by `lib/storage.ts`, so a stored link can never leak or go stale. */
    key: text("key").notNull(),
    filename: text("filename").notNull(),
    contentType: text("content_type").notNull(),
    sizeBytes: integer("size_bytes").notNull(),
    uploadedById: text("uploaded_by_id").references(() => user.id, { onDelete: "set null" }),
    /** Owner of the file, for the /dashboard/documents listing and quota accounting. */
    ownerId: text("owner_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    requestId: integer("request_id").references(() => requests.id, { onDelete: "cascade" }),
    messageId: integer("message_id").references(() => requestMessages.id, { onDelete: "cascade" }),
    /** Staff-uploaded deliverables are visible to the client; internal ones are not. */
    internal: boolean("internal").default(false).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [index("attachments_owner_idx").on(t.ownerId)],
);

/* ───────────────────────────── Quotes & invoices ───────────────────────────── */

export type MoneyLine = { label: string; quantity: number; unitCents: number };

export const quotes = pgTable(
  "quotes",
  {
    id: serial("id").primaryKey(),
    ref: text("ref").notNull().unique(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    requestId: integer("request_id").references(() => requests.id, { onDelete: "set null" }),
    title: text("title").notNull(),
    lines: jsonb("lines").$type<MoneyLine[]>().default([]).notNull(),
    /** Denormalised sum of `lines`, recomputed on every write by `totalCents()`. */
    amountCents: integer("amount_cents").default(0).notNull(),
    currency: text("currency").default("DZD").notNull(),
    /** `brouillon` | `envoye` | `accepte` | `refuse` | `expire` */
    status: text("status").default("brouillon").notNull(),
    validUntil: timestamp("valid_until"),
    note: text("note"),
    createdById: text("created_by_id").references(() => user.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => [index("quotes_user_idx").on(t.userId)],
);

export const invoices = pgTable(
  "invoices",
  {
    id: serial("id").primaryKey(),
    ref: text("ref").notNull().unique(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    quoteId: integer("quote_id").references(() => quotes.id, { onDelete: "set null" }),
    title: text("title").notNull(),
    lines: jsonb("lines").$type<MoneyLine[]>().default([]).notNull(),
    amountCents: integer("amount_cents").default(0).notNull(),
    currency: text("currency").default("DZD").notNull(),
    /** `brouillon` | `envoyee` | `payee` | `en_retard` | `annulee`. No payment
     *  provider is wired in — a human moves this, which is deliberate. */
    status: text("status").default("brouillon").notNull(),
    issuedAt: timestamp("issued_at"),
    dueAt: timestamp("due_at"),
    paidAt: timestamp("paid_at"),
    createdById: text("created_by_id").references(() => user.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => [index("invoices_user_idx").on(t.userId), index("invoices_status_idx").on(t.status)],
);

/* ───────────────────────────── Notifications & demos ───────────────────────────── */

export const notifications = pgTable(
  "notifications",
  {
    id: serial("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    /** `request` | `message` | `quote` | `invoice` | `subscription` | `system` */
    type: text("type").default("system").notNull(),
    title: text("title").notNull(),
    body: text("body"),
    /** In-app destination, e.g. `/dashboard/demandes/12`. */
    href: text("href"),
    readAt: timestamp("read_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [index("notifications_user_unread_idx").on(t.userId, t.readAt)],
);

export const demoRuns = pgTable(
  "demo_runs",
  {
    id: serial("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    serviceSlug: text("service_slug").notNull(),
    /** What was submitted, summarised — never the raw document. */
    input: text("input"),
    result: jsonb("result").$type<Record<string, unknown>>(),
    /** `ok` | `error` | `quota` */
    outcome: text("outcome").default("ok").notNull(),
    durationMs: integer("duration_ms"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [index("demo_runs_user_idx").on(t.userId)],
);

/* ───────────────────────────── Platform plumbing ───────────────────────────── */

export const activityLog = pgTable(
  "activity_log",
  {
    id: serial("id").primaryKey(),
    actorId: text("actor_id").references(() => user.id, { onDelete: "set null" }),
    /** Dotted verb, e.g. `request.status_changed`, `user.suspended`. */
    action: text("action").notNull(),
    entity: text("entity"),
    entityId: text("entity_id"),
    meta: jsonb("meta").$type<Record<string, unknown>>(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [index("activity_log_created_idx").on(t.createdAt)],
);

export const appSettings = pgTable("app_settings", {
  key: text("key").primaryKey(),
  value: jsonb("value").notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  updatedById: text("updated_by_id").references(() => user.id, { onDelete: "set null" }),
});

export const contactLeads = pgTable(
  "contact_leads",
  {
    id: serial("id").primaryKey(),
    name: text("name").notNull(),
    email: text("email").notNull(),
    message: text("message").notNull(),
    /** The solution picked in the marketing form's select, if any. */
    solution: text("solution"),
    /** `nouveau` | `traite` | `archive` */
    status: text("status").default("nouveau").notNull(),
    /** Set when a lead is converted to an account, so the admin sees the link. */
    userId: text("user_id").references(() => user.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [index("contact_leads_status_idx").on(t.status)],
);
