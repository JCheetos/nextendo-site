# Nginx cutover configurations

These two files capture the **before** and **after** state of the nginx
server block that fronts `nextendo.network`. They are reference artefacts
for the cutover window — not deployed automatically.

## `nginx-before.conf`

The config the VPS was running before the cutover. It served the legacy
vanilla-JS site (`Legacy/index.html`, `Legacy/login.html`, `Legacy/compte.html`, …) directly
from `/var/www/nextendo-legacy/`, with `/api/*` proxied to the Go backend.

Captured 2026-08-03 as a historical reference. **Do not re-apply** this
config after the cutover — once the Next.js bundle is live, the legacy
`root` directive would shadow it.

The `upstream nextendo_account` value is intentionally omitted from this
file: the Go backend lives in a separate private repo the user does not
want committed here. The path `/api/*` is the only thing that needs to
point at the Go host.

## `nginx-after.conf`

The config to apply at the cutover. It assumes:

- The Next.js standalone bundle is running on `http://127.0.0.1:3000`
  (started by `node .next/standalone/server.js` under systemd / pm2 /
  Docker).
- The Go account backend is on a separate port. Replace
  `127.0.0.1:8080` with the real host:port.

Highlights:

- `/_next/static/` is cached for 1 year (immutable) — these bundles are
  content-hashed by Next.js, so they're safe to cache aggressively.
- `*.svg|png|jpg|...` static assets are cached for 1 day.
- `/api/health` bypasses the cache and the access log — used by uptime
  monitors and Docker healthchecks.
- `/api/*` is proxied to the Go backend with no caching. The front-end
  sends the `Authorization: Bearer ...` header and the `nx_session` cookie;
  nginx must forward both.
- Everything else (`/`, `/login`, `/compte`, `/sessions`, …) is proxied
  to the Next.js app, with a short (10 s) HTML cache that uses stale
  responses on upstream errors so a flaky Go backend doesn't take down
  the marketing pages.
- Security headers (`X-Content-Type-Options`, `X-Frame-Options`,
  `Referrer-Policy`, `Permissions-Policy`) are applied to every response.

## Cutover procedure

1. **T-30 min**: announce the cutover window in `#nextendo-ops`.
2. **T-5 min**: copy `nginx-after.conf` to
   `/etc/nginx/sites-available/nextendo.network` on the VPS.
3. **T-0**: `sudo nginx -t && sudo systemctl reload nginx`. The Go
   backend does not need to be restarted.
4. **T+0**: the new config is live. Verify with
   `curl -I https://nextendo.network/` (200 OK) and
   `curl https://nextendo.network/api/health` (`{"status":"ok",...}`).
5. **T+5 min**: monitor the error rate. If you see 5xx, fall back with
   `sudo cp /etc/nginx/sites-available/nextendo.network.bak
   /etc/nginx/sites-available/nextendo.network && sudo systemctl reload nginx`.

## Rollback

If the cutover needs to be reverted:

1. Restore the legacy `root` directive and the `location` blocks for
   `/assets/`, the legacy `*.html` files, and `/api/`. The deployment copy
   should use the contents of `Legacy/` as the static root.
2. Re-point the `/` location back at the legacy static root.
3. `sudo nginx -t && sudo systemctl reload nginx`.

The Next.js container can keep running in the background; the nginx
config just won't reach it. No DB or data migration is needed — both
sites read the same Go backend.
