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
