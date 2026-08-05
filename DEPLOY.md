# Deployment guide — Phase 6

This file documents how to ship the Next.js site to production. The previous
vanilla-JS site (under `Legacy/`) is still served by nginx until
cutover; see "Cutover" at the bottom.

## Stack at a glance

- **Runtime**: Node.js ≥ 20 (matches `package.json` engines).
- **Build output**: `output: 'standalone'` produces a self-contained
  `server.js` under `.next/standalone/`.
- **Server**: that `server.js` (an Express-style server) — no nginx needed for
  the Next.js layer.
- **Public assets**: `public/` (favicon, avatars) live next to `server.js`.
- **Backend**: the Go account service (`nextendo-account`) is reached via
  `/api/*`. With `NEXTENDO_ACCOUNT_BASE_URL` empty, the front-end talks to
  the same origin and a reverse proxy (nginx / Caddy / Cloud Run sidecar)
  forwards `/api/*` to the Go service.
- **Health probe**: `GET /api/health` returns 200 with a JSON payload.

## Environment variables

| Variable                                | Required | Default                      | Purpose                                |
| --------------------------------------- | -------- | ---------------------------- | -------------------------------------- |
| `NODE_ENV`                              | no       | `development`                | Next.js mode.                          |
| `NEXT_PUBLIC_SITE_URL`                  | yes (prod) | `https://nextendo.network` | Canonical origin for sitemap / OG.    |
| `NEXTENDO_ACCOUNT_BASE_URL`             | no       | `""` (same-origin)           | Optional explicit base for the Go API. |
| `NEXT_PUBLIC_TURNSTILE_SITEKEY`         | no       | `""`                          | Public Turnstile widget key.           |
| `TURNSTILE_SECRET`                      | no       | `""`                          | Server-side Turnstile secret.          |
| `NEXT_PUBLIC_SENTRY_DSN`                | no       | `""`                          | Client telemetry (optional).           |

`src/lib/env.ts` validates `NEXT_PUBLIC_SITE_URL` (must start with `http://`
or `https://`) and exposes the typed `Env` object. All other vars are
optional and default to empty strings (Turnstile / Sentry are silently
disabled when empty).

## Local production build

```bash
npm ci
npm run build
PORT=3000 node .next/standalone/server.js
```

The standalone build produces a `.next/standalone/` directory that contains
just the runtime; copy `public/` and `.next/static/` next to it:

```
.next/standalone/
  server.js             ← entry point
  .next/standalone/     ← internal assets
public/                 ← static files (copy here)
.next/static/           ← hashed JS / CSS chunks (copy here)
```

## Docker

`Dockerfile` ships a two-stage image (`builder` + `runner`) using
`pnpm deploy` to slim the standalone bundle. Build & run:

```bash
docker build -t nextendo-site:2.0.0 .
docker run --rm -p 3000:3000 \
  -e NEXT_PUBLIC_SITE_URL=https://nextendo.network \
  -e NODE_ENV=production \
  nextendo-site:2.0.0
```

The container pings `/api/health` every 30 s via `HEALTHCHECK`.
`.dockerignore` excludes the legacy vanilla-JS site and CI/test artifacts.

## Reverse proxy / cutover

Until the cutover commit lands, the legacy server (under `Legacy/`) is
served by nginx. The Next.js container is meant to live behind the same
nginx instance — the cutover is one nginx config flip.

Sample nginx server block (`/etc/nginx/sites-enabled/nextendo.network`):

```nginx
upstream nextendo_app { server 127.0.0.1:3000; }
upstream nextendo_account { server 127.0.0.1:8080; }

server {
  server_name nextendo.network;

  # Old static site: drop these `location` blocks after cutover.
  location /assets/  { root /var/www/nextendo-legacy; }
  location ~ ^/(login|register|forgot|reset|verify)\.html$ {
    root /var/www/nextendo-legacy;
  }

  # Go account service: proxied to the Go backend.
  location /api/ { proxy_pass http://nextendo_account; }

  # Everything else: the Next.js standalone bundle.
  location / {
    proxy_pass http://nextendo_app;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_read_timeout 60s;
  }

  listen 443 ssl http2;
  ssl_certificate     /etc/letsencrypt/live/nextendo.network/fullchain.pem;
  ssl_certificate_key /etc/letsencrypt/live/nextendo.network/privkey.pem;
}
```

## Cutover

When you're ready to switch from the legacy site to the Next.js one:

1. Stop serving `index.html` / `login.html` / etc. from nginx.
2. Ensure `proxy_pass http://nextendo_app;` catches every path.
3. Keep `/api/*` proxied to the Go backend (no change).
4. Confirm `/api/health` returns 200 from a public test.
5. Remove the `Legacy/` directory from the repo (separate PR).

Until then, the legacy vanilla-JS site and the new Next.js site coexist.

## Rollback

If the cutover is rolled back:

1. Re-enable the static `location` blocks in nginx.
2. Stop the Next.js container (or roll the DNS A record back).
3. No DB or data migration is needed — both sites read the same backend.

## Post-deploy checks

After every production deployment:

```bash
curl -sI https://nextendo.network/                # 200 OK
curl -s  https://nextendo.network/api/health      # {"status":"ok", ...}
curl -sI https://nextendo.network/compte         # 307 → /login?next=%2Fcompte
curl -s  https://nextendo.network/sitemap.xml | head -2   # <urlset ...>
```
