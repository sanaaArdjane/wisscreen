# syntax=docker/dockerfile:1

# ─────────────────────────────────────────────────────────────────────────────
# Wissal Univers — production image for the Next.js 16 marketing site.
#
# Multi-stage build around Next's `output: "standalone"` (set in next.config.ts):
# the final image ships only the traced runtime deps + `server.js`, so it stays
# small and never carries the build toolchain or the full node_modules.
# Node 22 (Alpine) — Next 16 requires Node >= 20.9. pnpm comes from Corepack,
# pinned by the "packageManager" field in package.json.
# ─────────────────────────────────────────────────────────────────────────────

FROM node:22-alpine AS base
# libc6-compat: some native/optional deps expect glibc symbols on musl/Alpine.
RUN apk add --no-cache libc6-compat
RUN corepack enable
ENV NEXT_TELEMETRY_DISABLED=1
WORKDIR /app

# ── deps: install with a frozen lockfile so the image matches pnpm-lock.yaml ──
FROM base AS deps
# Only the files that affect the dependency graph, so this layer caches across
# source-only changes. pnpm-workspace.yaml carries install policy (allowBuilds).
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile

# ── builder: compile the app and emit the standalone server bundle ───────────
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Next.js inlines every NEXT_PUBLIC_* var into the client JS bundle at build time,
# not at container start — so these have to be supplied here, as build args, not
# via `docker run -e`. Neither is actually secret (a canonical site URL and a
# Turnstile *site* key are both meant to be public/embedded in the page), which is
# why they're plain ARGs rather than a build secret. TURNSTILE_SECRET_KEY is
# deliberately absent from this whole file: it's read server-side per-request, so
# it belongs at `docker run` time on whatever host actually runs this image, not
# baked into a layer here.
# Defaulted, not left bare: an ARG with no default resolves to an empty string
# (not "unset") when the CI variable behind it isn't configured yet, and
# lib/site.ts's `new URL(SITE_URL)` crashes the whole build on an empty string.
ARG NEXT_PUBLIC_SITE_URL=https://wisscreen.rflabs.tech
ARG NEXT_PUBLIC_TURNSTILE_SITE_KEY
ENV NEXT_PUBLIC_SITE_URL=$NEXT_PUBLIC_SITE_URL
ENV NEXT_PUBLIC_TURNSTILE_SITE_KEY=$NEXT_PUBLIC_TURNSTILE_SITE_KEY

RUN pnpm build

# ── runner: minimal runtime image ────────────────────────────────────────────
FROM base AS runner
ENV NODE_ENV=production
# Bind to all interfaces so the container is reachable via published ports.
ENV HOSTNAME=0.0.0.0
ENV PORT=3000

# Run as an unprivileged user rather than root.
RUN addgroup --system --gid 1001 nodejs \
  && adduser --system --uid 1001 nextjs

# Static assets served directly by the standalone server.
COPY --from=builder /app/public ./public
# The standalone output already includes a trimmed node_modules + server.js.
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs
EXPOSE 3000

CMD ["node", "server.js"]
