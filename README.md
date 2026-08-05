<div align="center">

<img src="https://nextendo.network/favicon.svg" alt="Nextendo" width="96" />

# nextendo-site

The **[nextendo.network](https://nextendo.network)** website — the front door to Nextendo Network. Accounts, friends, profile, presence, and the active-session manager.

[![Discord](https://img.shields.io/badge/Discord-5865F2?style=for-the-badge&logo=discord&logoColor=white)](https://discord.gg/XPfeCMwnzQ)
[![Visit](https://img.shields.io/badge/Visit-nextendo.network-3EE8C8?style=for-the-badge)](https://nextendo.network)
[![License](https://img.shields.io/badge/license-PolyForm%20Shield%201.0.0-orange?style=for-the-badge)](LICENSE.md)

</div>

---

## What's here

- **Marketing pages** — homepage (9 sections: hero, statement, features, architecture, install, figures, progress, FAQ, CTA), `/telecharger` (per-platform download with GitHub-releases fallback), `/status` (live server status with online counts).
- **Authentication** — `/login`, `/register`, `/forgot`, `/reset`, `/verify`, with HttpOnly-cookie auth, Cloudflare Turnstile integration, RHF + Zod validation, and same-origin redirect enforcement.
- **Account dashboard** — `/compte`: avatar editor (canvas-based composition), friends list with requests + "voir plus" pagination, game history, identity panel, security panel (change email / sessions / delete account), verify-email banner.
- **Active sessions** — `/sessions`: list of devices currently signed in (browser / Ryujinx / Switch), per-session revoke + close-all.
- **SEO** — hreflang × 10 locales + x-default, canonical URLs, Open Graph, Twitter Card, JSON-LD (Organization + WebSite + SoftwareApplication), sitemap.xml.
- **Accessibility** — skip link, single `<h1>` per page, `<dialog>`-native modals with focus trap + ESC, `role="alert"` on errors, `aria-live="polite"` on toasts, `prefers-reduced-motion` honoured.

## Stack

- **Next.js 16** (App Router) with React 19, Server Components by default, `output: 'standalone'` for production.
- **Tailwind CSS v4** via `@tailwindcss/postcss`; design tokens (OKLCH) live in the `@theme` block of `globals.css`.
- **next-intl 4** for 10 locales (fr default, en/es/pt/de/it/ru/zh/ja/ar); URLs stay clean (`localePrefix: 'never'`), the `nx_lang` cookie drives server-side locale.
- **RHF 7 + Zod 4** for forms.
- **Biome 1.9** for lint + format + organize-imports.
- **Vitest 1.6** for unit tests (116 tests across 7 files).
- **Playwright 1.49** for e2e tests (~60 specs across 6 files).

## Repository layout

```
src/
  app/
    [locale]/
      layout.tsx          locale-aware <html>, NextIntlProvider, metadata
      page.tsx            homepage (9 sections + JSON-LD)
      telecharger/        /telecharger (SSG × 10)
      status/             /status (force-dynamic, 15s revalidate)
      compte/             /compte (force-dynamic, server-side auth guard)
      sessions/           /sessions (force-dynamic)
      (auth)/              /login /register /forgot /reset /verify
    api/health/           GET /api/health (Route Handler)
    sitemap.ts            MetadataRoute.Sitemap with hreflang
    robots.ts             disallow /api/ /admin/, reference sitemap
  components/
    layout/               Backdrop, SiteHeader, SiteFooter, SiteAppHeader, LangSwitcher
    home/                 Hero, Statement, Features, Architecture, Install, Figures, Progress, FAQ, CTA
    auth/                 AuthShell, LoginForm, RegisterForm, ForgotForm, ResetForm, PasswordField, Turnstile
    dashboard/            AccountShell, MemberCard, IdentityPanel, SecurityPanel, FriendsPanel, HistoryPanel, EditProfileModal, EmailModal, DeleteModal, FriendModal, GameModal, SessionsPanel, Modal, Avatar, CopyButton, LogoutButton, …
  i18n/                   locales, routing, request config, actions
  lib/                    api (typed Go client), env (Zod), github (release fetcher), status (helpers), schemas (Zod), utils (cn)
  server/                 'use server' modules: auth, account, sessions
  proxy.ts                Next.js 16 proxy.ts → next-intl/middleware
messages/                 10 nested JSON dictionaries (~500 keys each)
scripts/                  extract-i18n.mjs, add-ui-messages.mjs
e2e/                      Playwright specs (auth, compte, sessions, home, a11y, smoke)
```

## Deploy

See **[DEPLOY.md](DEPLOY.md)** for env vars, Docker build, and the nginx cutover
plan. The legacy vanilla-JS site (under `Legacy/`) is still
served by nginx until the cutover commit lands; it can be deleted once the
new Next.js site is live.

```bash
# Local production build
npm ci
npm run build
PORT=3000 node .next/standalone/server.js

# Docker (multi-stage, ~180 MB)
docker build -t nextendo-site:2.0.0 .
docker run --rm -p 3000:3000 \
  -e NEXT_PUBLIC_SITE_URL=https://nextendo.network \
  -e NODE_ENV=production \
  nextendo-site:2.0.0

# Health probe
curl -s http://localhost:3000/api/health
# → {"status":"ok","uptime":12,"now":"…","version":"2.0.0"}
```

## Backend

The Go account service (`nextendo-account`) is **private** and not in this repo.
It is reached via `/api/*` (same origin). All calls go through `src/lib/api.ts`
which:

- Times out after 5s (`AbortController`).
- Whitelists GitHub release URLs before accepting them.
- Returns typed `AuthResult<T>` for auth endpoints so Server Actions can branch on `ok` / `error`.

## License

This website's source is available under the **[PolyForm Shield License 1.0.0](LICENSE.md)** — you may read, use, modify, and self-host it, but not use it to provide a product that competes with Nextendo Network.

---

<div align="center">
<sub><b>Nextendo Network Team</b> · Kazuals — founder &amp; developer</sub>
</div>
