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

/* ───────────────── Service catalogue, subscriptions, quotas ───────────────── */

/**
 * The catalogue of what WICLOUD sells — edited at `/admin/catalogue`.
 *
 * This used to be three platform tiers (Découverte / Pro / Entreprise) that
 * metered the *dashboard*: how many demandes you could file, how many demos you
 * could run. That was backwards. WICLOUD is a services agency, so an entry here
 * is a **service a customer buys** — a server, a block of SMTP sends, an AI
 * allowance — and a `subscriptions` row is one of them, provisioned.
 *
 * The table keeps its old name and its `default_quotas` column name so the
 * repurposing needs no destructive rename; nothing else about it is the same.
 */
export const plans = pgTable("plans", {
  slug: text("slug").primaryKey(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  /** `infrastructure` | `addon` | `support`. Groups the catalogue, nothing more. */
  category: text("category").default("infrastructure").notNull(),
  /** Price in cents for one `billingPeriod`; 0 = free, null = "sur devis". */
  priceCents: integer("price_cents"),
  currency: text("currency").default("DZD").notNull(),
  /** `monthly` | `yearly` | `one_off` */
  billingPeriod: text("billing_period").default("monthly").notNull(),
  /** What the customer gets, as label → value: `{ "vCPU": "4", "RAM": "8 Go" }`.
   *  Free-form on purpose — a server, an AI plan and an SMS bundle describe
   *  themselves with different words, and a column per spec would be endless. */
  specs: jsonb("specs").$type<Record<string, string>>().default({}).notNull(),
  features: jsonb("features").$type<string[]>().default([]).notNull(),
  /** The quota metrics this service *grants*, upserted into `quotas` when it is
   *  provisioned: `{ "smtp.emails": 50000, "storage.mb": 20000 }`.
   *  A metric absent here is unlimited; a value of 0 means "not included".
   *  (Column name is historical — this is a grant, not a default.) */
  defaultQuotas: jsonb("default_quotas").$type<Record<string, number>>().default({}).notNull(),
  sortOrder: integer("sort_order").default(0).notNull(),
  active: boolean("active").default(true).notNull(),
});

/**
 * One row per **provisioned service** — not one row per account.
 *
 * The unique index on `user_id` is gone, deliberately. A customer holds a server
 * *and* an SMTP allowance *and* an AI plan; collapsing those into one row was
 * what made this table describe a pricing tier instead of a delivery.
 * `lib/quotas.ts` exposes `listSubscriptions()` for that reason — anything that
 * still assumes a single row is a bug.
 *
 * `planSlug` is nullable so the desk can provision something bespoke that has no
 * catalogue entry, which is most of the first sale of anything.
 */
export const subscriptions = pgTable(
  "subscriptions",
  {
    id: serial("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    /** Null for a bespoke service — then `label` and `resourceSpec` carry it. */
    planSlug: text("plan_slug").references(() => plans.slug, { onDelete: "set null" }),
    /** What this instance is called for this customer, e.g. "VPS production". */
    label: text("label"),
    /** What was asked for, and what was agreed. Both optional — a service can be
     *  provisioned straight from a phone call. */
    requestId: integer("request_id").references(() => requests.id, { onDelete: "set null" }),
    quoteId: integer("quote_id").references(() => quotes.id, { onDelete: "set null" }),
    /** Copied from the catalogue at provisioning time, then owned by this row —
     *  re-pricing the catalogue must not silently re-price a live service. */
    priceCents: integer("price_cents"),
    currency: text("currency").default("DZD").notNull(),
    billingPeriod: text("billing_period").default("monthly").notNull(),
    /** The delivered spec, which can differ from the catalogue's. */
    resourceSpec: jsonb("resource_spec").$type<Record<string, string>>().default({}).notNull(),
    /** How the customer reaches it — panel URL, IP, hostname. Never a password:
     *  those go in `demo_secrets`-style encrypted storage, never a plain column. */
    accessNotes: text("access_notes"),
    /** `pending` | `provisioning` | `active` | `suspended` | `cancelled` */
    status: text("status").default("pending").notNull(),
    periodStart: timestamp("period_start").defaultNow().notNull(),
    periodEnd: timestamp("period_end"),
    /** Next renewal. There is no payment provider — a human watches this. */
    renewsAt: timestamp("renews_at"),
    cancelAtPeriodEnd: boolean("cancel_at_period_end").default(false).notNull(),
    note: text("note"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => [
    index("subscriptions_user_idx").on(t.userId),
    index("subscriptions_status_idx").on(t.status),
  ],
);

export const quotas = pgTable(
  "quotas",
  {
    id: serial("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    /** A consumable the agency provides, e.g. `smtp.emails`, `ai.requests`,
     *  `sms.messages`, `storage.mb`. See `METRIC_LABELS` in `lib/quotas.ts`.
     *  Free text on purpose: a new metered service is a label, not a migration. */
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
    /** When the *other* side read it, so the thread can draw an unread divider
     *  and the desk can tell "unanswered" from "unseen". One timestamp, not a
     *  per-viewer table: a request thread has exactly two sides. */
    readAt: timestamp("read_at"),
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
    /** An asset of a demo the admin authored — an instructions PDF, a diagram.
     *  Owned by its author, readable by anyone entitled to the demo, which is
     *  why `/api/uploads`' GET cannot decide on `ownerId` alone. */
    demoId: integer("demo_id").references(() => demos.id, { onDelete: "cascade" }),
    /** A file exchanged on one demo run: the customer's submission, or the
     *  deliverable the desk sends back. Which one it is follows from
     *  `uploadedById` — there is no third column for it, and no
     *  `demo_runs.result_attachment_id`, which would make the two tables
     *  reference each other in a cycle. */
    demoRunId: integer("demo_run_id").references(() => demoRuns.id, { onDelete: "cascade" }),
    /** Staff-uploaded deliverables are visible to the client; internal ones are not. */
    internal: boolean("internal").default(false).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [
    index("attachments_owner_idx").on(t.ownerId),
    index("attachments_demo_idx").on(t.demoId),
    index("attachments_demo_run_idx").on(t.demoRunId),
  ],
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
    /** Object key of the PDF the client was actually sent. Kept so "what did we
     *  send them?" is answerable months later, after the lines were edited. */
    pdfKey: text("pdf_key"),
    sentAt: timestamp("sent_at"),
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
    note: text("note"),
    /** See `quotes.pdfKey`. */
    pdfKey: text("pdf_key"),
    sentAt: timestamp("sent_at"),
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
    /** Who caused it. Null for a system notice or a deleted account. */
    actorId: text("actor_id").references(() => user.id, { onDelete: "set null" }),
    /** What it is about — `request` / `quote` / `demo` / … plus its id. The live
     *  stream carries these so an open page can tell "refresh me" from "not
     *  mine" without refetching the row first. */
    entity: text("entity"),
    entityId: text("entity_id"),
    readAt: timestamp("read_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [index("notifications_user_unread_idx").on(t.userId, t.readAt)],
);

/**
 * A demo the admin authored and hands to a named customer.
 *
 * The content is `blocks`, a discriminated union in `lib/demos.ts`, because the
 * owner's demos mix kinds: a link to a live platform *plus* test credentials
 * *plus* an expiry; or an instructions PDF *plus* SSH details. One `kind` per
 * demo would mean three demos for one deliverable, and a column per kind would
 * mean a migration for every new one. This is the same shape `quotes.lines`
 * already uses, for the same reason.
 *
 * Adding a ninth block kind is a type member, a Zod member, an editor case and
 * a renderer case. It is never a migration and never a backfill.
 */
export const demos = pgTable(
  "demos",
  {
    id: serial("id").primaryKey(),
    /** URL segment for `/dashboard/demos/<slug>`, and what the legacy
     *  `demo_runs.service_slug` is matched against when backfilling `demo_id`. */
    slug: text("slug").notNull().unique(),
    title: text("title").notNull(),
    summary: text("summary"),
    /** Free text, for a chip and a filter. Never branched on — an enum here
     *  would be the `kind` column this design exists to avoid. */
    category: text("category"),
    /** Optional pointer at a `Service.slug` in `lib/data/services.ts`. No FK:
     *  that list is a code file, not a table. */
    serviceSlug: text("service_slug"),
    /** `DemoBlock[]` — see `lib/demos.ts`. Secret values are NOT in here; only
     *  their labels are. The values live in `demo_secrets`, encrypted. */
    blocks: jsonb("blocks").$type<unknown[]>().default([]).notNull(),
    /** `brouillon` | `publie` | `archive` */
    status: text("status").default("brouillon").notNull(),
    /** `assigned` (only granted accounts) | `all_clients` (every signed-in client) */
    visibility: text("visibility").default("assigned").notNull(),
    /** Demo-wide expiry. A per-grant `expiresAt` can only shorten it. */
    expiresAt: timestamp("expires_at"),
    createdById: text("created_by_id").references(() => user.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => [index("demos_status_idx").on(t.status)],
);

/** Who may open a demo. A revoke is a timestamp, not a delete — "we did once
 *  hand this to him" is exactly the thing the desk needs to remember. */
export const demoAccess = pgTable(
  "demo_access",
  {
    id: serial("id").primaryKey(),
    demoId: integer("demo_id")
      .notNull()
      .references(() => demos.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    grantedById: text("granted_by_id").references(() => user.id, { onDelete: "set null" }),
    /** Why — "pour la réunion du 12". Staff-visible only. */
    note: text("note"),
    expiresAt: timestamp("expires_at"),
    revokedAt: timestamp("revoked_at"),
    /** Stamped when a secret is revealed or a run starts — the only honest
     *  "did they actually use it?" signal. Never written from a page render. */
    lastAccessAt: timestamp("last_access_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [
    // A re-grant after a revoke is an upsert on this key, not a second row.
    uniqueIndex("demo_access_demo_user_key").on(t.demoId, t.userId),
    index("demo_access_user_idx").on(t.userId),
  ],
);

/**
 * Credentials and SSH keys, encrypted at rest by `lib/crypto.ts`.
 *
 * Their own table rather than a field inside `demos.blocks`, because the admin
 * list selects demos wholesale and the editor is a client component — a secret
 * inside the jsonb would reach both. Here, "never leaves the server unless
 * someone explicitly asks for it" is the default rather than a rule to remember.
 */
export const demoSecrets = pgTable(
  "demo_secrets",
  {
    id: serial("id").primaryKey(),
    demoId: integer("demo_id")
      .notNull()
      .references(() => demos.id, { onDelete: "cascade" }),
    /** The owning block's own `id` — a uuid the editor mints when the block is
     *  added, never its index. Reordering blocks must not re-point a password
     *  at a different server. */
    blockId: text("block_id").notNull(),
    label: text("label").notNull(),
    /** `v1:<iv>:<tag>:<ct>`, base64url, AES-256-GCM. Never selected by a list
     *  query and never passed into a client component. */
    ciphertext: text("ciphertext").notNull(),
    revealCount: integer("reveal_count").default(0).notNull(),
    createdById: text("created_by_id").references(() => user.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => [uniqueIndex("demo_secrets_block_label_key").on(t.demoId, t.blockId, t.label)],
);

/**
 * One exchange on an `upload` block: the customer submits a file, the desk
 * processes it and answers. Rows predating the `demos` table are runs of the
 * old simulator and keep rendering — every new column here is nullable.
 */
export const demoRuns = pgTable(
  "demo_runs",
  {
    id: serial("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    /** A denormalised label that outlives the demo — the same reasoning
     *  `invoiceFromQuote` uses when it copies `quote.lines` instead of
     *  referencing them. `demoId` is the real relation; this has no FK. */
    serviceSlug: text("service_slug").notNull(),
    demoId: integer("demo_id").references(() => demos.id, { onDelete: "set null" }),
    /** Which grant it ran under. */
    demoAccessId: integer("demo_access_id").references(() => demoAccess.id, {
      onDelete: "set null",
    }),
    /** Staff member who processed it. */
    handledById: text("handled_by_id").references(() => user.id, { onDelete: "set null" }),
    /** What the desk wrote back alongside the deliverable. */
    note: text("note"),
    /** What was submitted, summarised — never the raw document. */
    input: text("input"),
    result: jsonb("result").$type<Record<string, unknown>>(),
    /** `en_attente` | `en_cours` | `ok` | `error` | `quota`. One lifecycle
     *  column, not a `status` beside an `outcome` — two of those is how one of
     *  them goes stale. `quota` is legacy: the old simulator's refusals. */
    outcome: text("outcome").default("ok").notNull(),
    durationMs: integer("duration_ms"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => [index("demo_runs_user_idx").on(t.userId), index("demo_runs_demo_idx").on(t.demoId)],
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
