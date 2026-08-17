# Deployment guide

This document is a deployment runbook and a set of templates for the Next.js
front-end. It does not describe the current production server as fact: the
nginx installation, process supervisor, TLS paths and private Go backend must
be verified by the deployment team before use.

The repository contains both the new Next.js application and the historical
vanilla-JS site under `Legacy/`. The nginx cutover is intentionally separate
from the application build. The reference configurations in `deploy/` are
starting points, not automatically deployed infrastructure.

## Architecture

- **Runtime**: Node.js 20 or newer.
- **Build**: Next.js `output: 'standalone'` produces `.next/standalone/server.js`.
- **Public assets**: `public/` and `.next/static/` must be copied into the
  standalone runtime layout.
- **Front-end**: the standalone Next.js server listens on port `3000` by
  default in the supplied Docker image.
- **Account backend**: the private Go service handles `/api/*`, except the
  front-end health route `/api/health` and the cloud-save route handled by
  Next.js.
- **Reverse proxy**: nginx, Caddy or an equivalent edge proxy terminates TLS
  and routes public traffic to Next.js and account traffic to Go.

The Go service, its database, its credentials and its production supervisor
configuration are not included in this repository. Do not infer their host,
port or operational state from the placeholder values in the nginx template.

## Environment variables

| Variable | Default | Purpose |
| --- | --- | --- |
| `NODE_ENV` | `development` | Runtime mode. Use `production` for deployments. |
| `NEXT_PUBLIC_SITE_URL` | `https://nextendo.network` | Public canonical origin used by the application. Verify URL generation for each environment. |
| `NEXTENDO_ACCOUNT_BASE_URL` | empty | Explicit Go API base URL. In the production reverse-proxy model, leave empty unless the application is intentionally configured to call another origin. |
| `NEXT_PUBLIC_TURNSTILE_SITEKEY` | empty | Public Cloudflare Turnstile site key. |
| `TURNSTILE_SECRET` | empty | Server-side Turnstile secret. Never expose it to the browser. |
| `NEXT_PUBLIC_SENTRY_DSN` | empty | Optional client telemetry DSN. |

`src/lib/env.ts` validates these values. Turnstile and telemetry are disabled
when their values are empty. Secrets must be supplied through the deployment
secret manager or process environment, never committed to the repository.

## Build and test

Run the checks from a clean checkout before building an image:

```bash
corepack enable
pnpm install --frozen-lockfile
pnpm run typecheck
pnpm run lint
pnpm run test
pnpm run build
```

End-to-end tests additionally require Chromium and an account-service test
backend. The local mock helpers referenced by `playwright.config.ts` are not
tracked in the public repository, so a clean clone needs an equivalent test
backend or a separately supplied internal fixture.

## Standalone runtime

For a manual deployment, the files must end up in this layout:

```text
.next/standalone/
  server.js
  node_modules/
  .next/static/
  public/
```

The standalone server is started from the standalone directory:

```bash
PORT=3000 HOSTNAME=0.0.0.0 NODE_ENV=production \
  node .next/standalone/server.js
```

The exact process supervisor (systemd, PM2, Docker or another service) is an
infrastructure decision and is not included here. Keep the process bound to a
private interface when nginx is the public entry point.

## Docker deployment

The supplied `Dockerfile` uses a two-stage Node 20 Alpine build and Next.js
standalone tracing. It does not use `pnpm deploy`.

Build with an immutable release tag, preferably the Git commit SHA:

```bash
docker build --pull -t nextendo-site:<git-sha> .
```

Run a local or staging instance:

```bash
docker run -d --name nextendo-site-<git-sha> \
  -p 127.0.0.1:3000:3000 \
  -e NODE_ENV=production \
  -e NEXT_PUBLIC_SITE_URL=https://nextendo.network \
  -e NEXTENDO_ACCOUNT_BASE_URL= \
  nextendo-site:<git-sha>
```

The image healthcheck calls `/api/health`. The endpoint is a liveness probe:
it confirms that the Next.js runtime is reachable and always returns HTTP 200.
It is not a readiness check for the Go backend. `?strict=1` is diagnostic only
and should not be used as an authoritative deployment gate until its asynchronous
upstream check is awaited by the route handler.

Verify the container before changing nginx:

```bash
curl --fail-with-body http://127.0.0.1:3000/api/health
curl --fail-with-body http://127.0.0.1:3000/
```

## Nginx template and prerequisites

`deploy/nginx-after.conf` is a post-cutover template. Before applying it, the
deployment team must:

1. Replace `127.0.0.1:8080` with the real Go backend host and port.
2. Confirm the Next.js process is reachable at `127.0.0.1:3000`, or change the
   `nextendo_app` upstream.
3. Confirm TLS certificate and key paths.
4. Review security headers against the organization's policy.
5. Review cache policy for any cookies, authorization headers or personalized
   public routes.
6. Confirm that the `/api/*` proxy forwards cookies and authorization headers
   as required by the Go service.
7. Check that the `proxy_cache_path` directory exists and is writable by nginx,
   or remove the shared cache configuration.
8. Validate the complete nginx configuration with `sudo nginx -t`.

The template deliberately does not define a custom named 404 handler; Next.js
receives upstream 404 responses and renders its own not-found page. The
template bypasses shared HTML caching for authentication and dashboard routes,
and bypasses it when cookies, authorization or `Set-Cookie` are present. This
is a baseline safeguard, not a substitute for reviewing the production cache
policy.

## Pre-cutover checklist

Do not proceed until each item has an owner and a confirmed value:

1. Identify the active nginx server block and back it up.
2. Confirm the real Go backend endpoint and its health behavior.
3. Confirm TLS certificate paths and renewal ownership.
4. Build and start the candidate Next.js image.
5. Verify the local health response, homepage and static assets.
6. Verify that `/api/health` is routed to Next.js while other `/api/*` routes
   reach the Go backend.
7. Test an unauthenticated dashboard request and record its actual redirect.
8. Confirm that no authenticated response is eligible for shared caching.
9. Run `sudo nginx -t` against the complete configuration.
10. Prepare a rollback copy and an operator for the cutover window.

Example backup:

```bash
sudo cp -a /etc/nginx/sites-enabled/nextendo.network \
  /etc/nginx/sites-enabled/nextendo.network.bak
```

## Cutover procedure

The exact file path and deployment mechanism depend on the VPS. The safe
sequence is:

1. Copy the reviewed nginx template into the team's staging configuration.
2. Replace all placeholders and preserve the existing TLS and operational
   settings that are not represented in this repository.
3. Run `sudo nginx -t`. Stop if it fails.
4. Reload nginx rather than restarting it:

   ```bash
   sudo systemctl reload nginx
   ```

5. Verify the public application without assuming a specific redirect code:

   ```bash
   curl --fail-with-body -D /tmp/nextendo-home.headers \
     -o /tmp/nextendo-home.html https://nextendo.network/
   curl --fail-with-body https://nextendo.network/api/health
   curl --fail-with-body https://nextendo.network/robots.txt
   curl --fail-with-body https://nextendo.network/sitemap.xml
   curl --fail-with-body -I https://nextendo.network/_next/static/
   ```

6. Test login, logout, dashboard, sessions, cloud saves and the relevant Go
   API routes with a real test account.
7. Inspect nginx and application logs for upstream errors, cache warnings,
   redirect loops and unexpected `Set-Cookie` behavior.
8. Keep `Legacy/` available during the observation window. Its deletion is a
   separate repository decision, not an automatic consequence of cutover.

## Rollback procedure

If the cutover introduces errors:

1. Stop accepting the new configuration if it has not been reloaded.
2. Restore the backed-up nginx configuration or the last known-good template.
3. Validate before reloading:

   ```bash
   sudo nginx -t
   sudo systemctl reload nginx
   ```

4. Confirm the legacy public pages, `/assets/`, legacy auth pages and `/api/*`
   behave as expected for the pre-cutover installation.
5. Keep the candidate image and logs available for diagnosis; do not delete
   the previous image or the rollback configuration.

The repository cannot guarantee database compatibility or rollback behavior for
the private Go service. Confirm those assumptions with the backend owner before
the cutover window.

## Post-deployment checks

At minimum, verify:

```bash
curl --fail-with-body https://nextendo.network/
curl --fail-with-body https://nextendo.network/api/health
curl --fail-with-body https://nextendo.network/robots.txt
curl --fail-with-body https://nextendo.network/sitemap.xml
```

Also check browser behavior for locale selection, authentication cookies,
protected redirects, static assets, server status and cloud saves. Treat the
response from `/api/health?strict=1` as diagnostic until the route implementation
is changed to await its upstream check.

## Reference files

- [`deploy/nginx-before.conf`](deploy/nginx-before.conf): captured legacy
  configuration, historical reference only; do not apply after cutover.
- [`deploy/nginx-after.conf`](deploy/nginx-after.conf): post-cutover nginx
  template; replace placeholders and validate locally before use.
- [`deploy/README.md`](deploy/README.md): short explanation of the two nginx
  reference files.
- [`Dockerfile`](Dockerfile): standalone production image.
- [`src/app/api/health/route.ts`](src/app/api/health/route.ts): liveness route.
