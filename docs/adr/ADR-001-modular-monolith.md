# ADR-001: Keep the single-container modular monolith, and harden it before scaling out

**Status:** Proposed
**Date:** 2026-10-31
**Deciders:** Owner (SETYCORP), lead developer

## Context

SETYCORP is one Next.js 16 App Router application (~290 TS/TSX files, ~42k lines) that
serves three audiences from one process:

| Surface | Routes | Rendering | Data |
| --- | --- | --- | --- |
| Marketing site | `/`, `/solutions/*`, `/blog/*`, legal | Static + ISR (`revalidate = 600`), content via `unstable_cache` | `site_content`, `site_solutions`, `site_posts` |
| Client space | `/dashboard/*` | Dynamic, session-gated | requests, quotes, invoices, demos, subscriptions |
| Back-office | `/admin/*` | Dynamic, `can()`-gated | everything, plus users, catalogue, journal |

Shared runtime:

- **One Docker image** (`output: "standalone"`, `node server.js`). CI builds it on every
  push to `main` and pushes it to Docker Hub. The deploy itself is manual.
- **Neon Postgres** via a 10-connection `pg` pool on the pooled endpoint, 23 tables,
  Drizzle migrations run by hand (5 so far).
- **Better Auth** for sessions, roles and impersonation. **`can()`** in
  `lib/permissions.ts` is the single authorization point (role defaults plus per-account
  overrides).
- **Realtime** is SSE fed by Postgres `LISTEN/NOTIFY` on a dedicated unpooled connection.
- **Neon Object Storage** (S3 API) with presigned PUT/GET; bytes never pass through Node.
- **Optional integrations** (Resend, storage, Google, Turnstile) are designed to degrade
  rather than fail when unset.

Forces:

- It is a small team and an agency site. Traffic is modest and the back-office has
  tens of users, not thousands.
- The marketing pages are heavy: a 3D scene, video and GSAP. Today every byte, including
  `public/`, is served by the Node process. There is no CDN.
- Several mechanisms are **correct only with exactly one instance**:
  - `unstable_cache` / `updateTag` invalidate the *local* data cache, so a second container
    would serve stale site content for up to 10 minutes after an admin save.
  - Better Auth's default rate-limit store is in-memory, per process.
  - The ISR output lives on the container's filesystem.
- Operational visibility is thin. There is no error tracking, no health endpoint and no
  structured logging, and the deploy step is not automated.
- `NEXT_PUBLIC_SITE_URL` is baked in at build, so one image corresponds to one environment.

## Decision

Keep the **single-container modular monolith**. Spend the next iterations on
**operational hardening and a CDN**, not on splitting or replicating the app. Replicate
only when a measured limit forces it, and fix the single-instance assumptions as part of
that work, not before.

## Options Considered

### Option A: Stay a single-instance monolith and harden it (recommended)

| Dimension | Assessment |
|-----------|------------|
| Complexity | Low. No new moving parts beyond a CDN and monitoring. |
| Cost | Low: one container, Neon, a CDN's free or low tier. |
| Scalability | Vertical scaling plus a CDN covers this traffic profile by a wide margin. |
| Team familiarity | High. This is the current shape. |

**Pros:**
- Every documented invariant keeps holding, including read-your-own-writes in `/admin/site`.
- One deploy, one log stream, one place to debug.
- A CDN in front takes the 3D/video/static weight off Node.

**Cons:**
- A single point of failure. A crash or deploy means a short outage.
- Vertical ceiling, though it is far away at current load.

### Option B: Scale out horizontally now (N replicas behind a load balancer)

| Dimension | Assessment |
|-----------|------------|
| Complexity | Medium-High. Requires a shared cache handler (Redis), a shared rate-limit store, sticky or stateless SSE, and zero-downtime migrations. |
| Cost | Medium: Redis plus extra containers plus a load balancer. |
| Scalability | High. |
| Team familiarity | Low-Medium. |

**Pros:** removes the single point of failure and enables rolling deploys.
**Cons:** every single-instance assumption above becomes a silent bug, such as stale
content after an admin save or rate limits multiplied by N. That is a lot of
infrastructure for traffic that does not need it.

### Option C: Split the marketing site from the platform

| Dimension | Assessment |
|-----------|------------|
| Complexity | High. Two apps, a shared design system and content API, and cross-app auth links. |
| Cost | Medium. |
| Scalability | High for marketing (fully static on a CDN). |
| Team familiarity | Medium. |

**Pros:** the public site gets an independent deploy cadence and edge hosting, and
platform incidents cannot take it down.
**Cons:** duplicates the layout, tokens and content model. `/admin/site` would edit a
different app's content through an API that does not exist yet. Most of the benefit is
available from Option A's CDN at a fraction of the cost.

## Trade-off Analysis

The real risk today is **not capacity, it is visibility and recovery**. A failed render
or a broken migration is currently discovered by a visitor. Option B and Option C both
buy capacity and isolation the app does not need yet, and both multiply the operational
surface the team must watch. Option A keeps the architecture's biggest strength: the
codebase's invariants are written down and enforced in one process. It also addresses
the two cheap, high-leverage gaps, a CDN and observability.

Revisit when **any** of these is measured:
- p95 TTFB on dynamic routes stays above 800 ms under normal load;
- the 10-connection pool saturates;
- uptime requirements reach a contractual SLA (for example, banks on WIFACILITY/Etaysir)
  that a single container cannot meet.

Then do Option B, starting with a shared cache handler and a rate-limit store.

## Consequences

- **Easier:** debugging, deploying, keeping the `AGENTS.md` invariants true, and
  onboarding new developers.
- **Harder:** zero-downtime deploys, because a restart is a brief outage until a second
  instance exists.
- **To revisit:**
  - the single-instance assumptions (data cache, rate limit, ISR on disk) the moment a
    second replica is added;
  - `ENCRYPTION_KEY` rotation (the `v1:` prefix is the seam);
  - the one-image-per-environment constraint from build-time `NEXT_PUBLIC_*` values.

## Action Items

1. [ ] Put a CDN (for example, Cloudflare) in front of the origin. `public/photos`,
       `public/videos` and `/_next/static` are already immutable-cached, so it is
       configuration only.
2. [ ] Add error tracking (Sentry or similar) through `instrumentation.ts`, covering
       server actions, route handlers and the client.
3. [ ] Add `GET /api/health` (process alive plus `select 1` against the database) and wire
       it to the container's health check and an uptime monitor.
4. [ ] Automate the deploy after the Docker push (webhook or SSH step) and add a rollback
       note to `docs/APRES-DEPLOIEMENT.md` (redeploy the previous `sha-` tag).
5. [ ] Run `pnpm db:migrate` as an explicit, gated CI job against a Neon branch first,
       then production. It is manual today and easy to forget, as `0004` shows.
6. [ ] Document in `AGENTS.md` that the app assumes **one replica**, listing the three
       mechanisms that break with two.
7. [ ] Bump the GitHub Actions flagged for the Node 20 deprecation in `ci-cd.yml`.
