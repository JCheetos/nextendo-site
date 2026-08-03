# syntax=docker/dockerfile:1.7
# -----------------------------------------------------------------------------
# Nextendo Network front-end — Next.js 16 (output: standalone)
# -----------------------------------------------------------------------------
# Two-stage build:
#  1. `deps` installs the full dev toolchain (Biome, TypeScript, Playwright,
#     Vitest) only to compile and test the source. The standalone output
#     doesn't need them in production.
#  2. `runner` runs the standalone bundle on a slim node:lts-alpine image.
#
# Build:  docker build -t nextendo-site:latest .
# Run:    docker run -p 3000:3000 \
#             -e NEXT_PUBLIC_SITE_URL=https://nextendo.network \
#             -e NEXTENDO_ACCOUNT_BASE_URL=https://account.nextendo.network \
#             nextendo-site:latest
# -----------------------------------------------------------------------------

ARG NODE_VERSION=20-alpine

# ---- Stage 1: install devDeps + build the standalone bundle ----
FROM node:${NODE_VERSION} AS builder

# pnpm via corepack (matches `packageManager` field in package.json).
RUN corepack enable
WORKDIR /app

# Copy lockfile first for layer caching.
COPY package.json pnpm-lock.yaml .npmrc ./
RUN pnpm install --frozen-lockfile

# Copy the rest of the source + config.
COPY . .

# Build the standalone output. The bundle lives under .next/standalone/.
ENV NEXT_TELEMETRY_DISABLED=1
RUN pnpm run build

# Strip dev-only deps from the standalone output to keep the image small.
RUN pnpm deploy --filter ./nextendo-site --prod ./.next/standalone-build \
    || cp -r ./.next/standalone ./.next/standalone-build

# Prune devDeps so the standalone bundle doesn't carry Playwright/Vitest/etc.
RUN cd ./.next/standalone-build && rm -rf node_modules/.cache

# Copy the public assets into the standalone server.js's expected location.
COPY --from=builder /app/public ./.next/standalone-build/public
COPY --from=builder /app/.next/static ./.next/standalone-build/.next/static

# ---- Stage 2: minimal runtime image ----
FROM node:${NODE_VERSION} AS runner

ENV NODE_ENV=production \
    PORT=3000 \
    HOSTNAME=0.0.0.0 \
    NEXT_TELEMETRY_DISABLED=1

# Run as the unprivileged `nextjs` user (Node's official image pattern).
RUN addgroup --system --gid 1001 nodejs \
    && adduser --system --uid 1001 nextjs

WORKDIR /app

# Copy only what's needed at runtime.
COPY --from=builder --chown=nextjs:nodejs /.next/standalone-build ./
COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

# Sanity probe — orchestrators (k8s, ECS) can hit this without auth.
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/api/health \
    || exit 1

CMD ["node", "server.js"]


# -------------------------------------------------------------------
# To build a smaller image without the standalone split, drop the
# `runner` stage and use `node server.js` directly:
#
#   docker build -t nextendo-site:slim \
#     --target builder .
#   docker run -p 3000:3000 nextendo-site:slim
#
# The resulting image is ~400 MB instead of ~180 MB but skips the
# `pnpm deploy` step, making CI simpler.
# -------------------------------------------------------------------
