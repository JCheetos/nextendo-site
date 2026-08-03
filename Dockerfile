# syntax=docker/dockerfile:1.7
# -----------------------------------------------------------------------------
# Nextendo Network front-end — Next.js 16 (output: standalone) + pnpm
# -----------------------------------------------------------------------------
# Two-stage build:
#  1. `builder` installs the full dev toolchain (Biome, TypeScript,
#     Playwright, Vitest) via pnpm/corepack, builds the source, and
#     copies the standalone bundle to the runner stage.
#  2. `runner` runs the standalone bundle on a slim node:20-alpine image
#     as the unprivileged 'nextjs' user. The bundle ships with a minimal
#     node_modules/ that already excludes devDeps (Next.js' standalone
#     tracer handles that automatically).
#
# Build:  docker build -t nextendo-site:latest .
# Run:    docker run --rm -p 3000:3000 \
#             -e NEXT_PUBLIC_SITE_URL=https://nextendo.network \
#             -e NEXTENDO_ACCOUNT_BASE_URL=https://account.nextendo.network \
#             nextendo-site:latest
# -----------------------------------------------------------------------------

ARG NODE_VERSION=20-alpine

# ---- Stage 1: builder ----
FROM node:${NODE_VERSION} AS builder

# Enable pnpm via corepack (pinned by `packageManager` field in package.json).
RUN corepack enable
WORKDIR /app

# Copy lockfile first for layer caching.
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

# Copy the rest of the source + config.
COPY . .

# Build the standalone output. .next/standalone/ already contains
# server.js + a trimmed node_modules/ (Next.js' standalone tracer drops
# devDeps automatically — no `pnpm deploy` needed).
ENV NEXT_TELEMETRY_DISABLED=1
RUN pnpm run build

# ---- Stage 2: runner (minimal runtime image) ----
FROM node:${NODE_VERSION} AS runner

ENV NODE_ENV=production \
    PORT=3000 \
    HOSTNAME=0.0.0.0 \
    NEXT_TELEMETRY_DISABLED=1

# Run as the unprivileged 'nextjs' user (Node's official image pattern).
RUN addgroup --system --gid 1001 nodejs \
    && adduser --system --uid 1001 nextjs

WORKDIR /app

# Copy only what's needed at runtime:
#  - .next/standalone/ contains server.js + trimmed node_modules/.
#  - public/ holds static assets (favicon, avatars).
#  - .next/static/ holds the hashed JS/CSS chunks referenced by server.js.
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

# Sanity probe — orchestrators (k8s, ECS) can hit this without auth.
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/api/health \
    || exit 1

CMD ["node", "server.js"]
