<div align="center">

<img src="https://nextendo.network/favicon.svg" alt="Nextendo" width="96" />

# nextendo-site

The **[nextendo.network](https://nextendo.network)** website and account front-end for Nextendo Network.

[![Discord](https://img.shields.io/badge/Discord-5865F2?style=for-the-badge&logo=discord&logoColor=white)](https://discord.gg/XPfeCMwnzQ)
[![Visit](https://img.shields.io/badge/Visit-nextendo.network-3EE8C8?style=for-the-badge)](https://nextendo.network)
[![License](https://img.shields.io/badge/license-PolyForm%20Shield%201.0.0-orange?style=for-the-badge)](LICENSE.md)

</div>

---

## Overview

This repository contains the Next.js front-end for Nextendo Network: public project pages, authentication, account management, active sessions and cloud saves. The private Go account service is consumed through the same-origin `/api/*` boundary and is not included here.

The repository is currently in a migration phase. The new Next.js application and the historical vanilla-JS implementation under `Legacy/` coexist until the production nginx cutover is completed. See [DEPLOY.md](DEPLOY.md) for the deployment and rollback procedure.

## Features

- **Public pages**: homepage, per-platform downloads with GitHub Releases fallback, and live server status.
- **Authentication**: login, registration, password recovery, reset and email verification.
- **Account dashboard**: profile and avatar editing, identity, friends, game history, account security and email verification.
- **Active sessions**: device listing, per-session revocation and close-all.
- **Cloud saves**: account-backed save management for eligible games.
- **Internationalization**: 10 locales with French as the default language and Arabic RTL support.
- **SEO**: canonical URLs, Open Graph metadata, JSON-LD, sitemap and hreflang alternates.
- **Accessibility**: skip links, keyboard-oriented modal behavior, focus management, live status messages and reduced-motion support.

## Stack

- **Next.js 16** with App Router, React 19 and Server Components by default.
- **Tailwind CSS v4** with OKLCH design tokens in `src/app/globals.css`.
- **next-intl 4** for `fr`, `en`, `es`, `pt`, `de`, `it`, `ru`, `zh`, `ja` and `ar`.
- **React Hook Form 7 + Zod 4** for form state and validation.
- **Biome 1.9** for linting and formatting.
- **Vitest 1.6** for unit tests.
- **Playwright 1.49** for end-to-end tests.
- **Node.js 20 or newer** and **pnpm 9.15.0**.

## Requirements

- Node.js `>=20`
- Corepack with pnpm `9.15.0`
- Docker, if using the container workflow
- Chromium and its system dependencies for Playwright E2E tests

## Development

```bash
corepack enable
pnpm install --frozen-lockfile
pnpm run dev
```

The development server runs at <http://localhost:3000>.

The Go account service is private and is not part of this repository. Set `NEXTENDO_ACCOUNT_BASE_URL` to an accessible account service, or place the service behind the same-origin reverse proxy. The repository's local mock-account helpers are intentionally excluded from Git and are not available from a clean public clone.

## Environment variables

All variables are optional for a basic local boot. Production deployments should configure the values required by the enabled integrations.

| Variable | Default | Purpose |
| --- | --- | --- |
| `NODE_ENV` | `development` | Next.js runtime mode. |
| `NEXT_PUBLIC_SITE_URL` | `https://nextendo.network` | Canonical public origin used by site metadata and URL generation. |
| `NEXTENDO_ACCOUNT_BASE_URL` | empty | Explicit base URL for the private Go account API; empty uses same-origin routing. |
| `NEXT_PUBLIC_TURNSTILE_SITEKEY` | empty | Public Cloudflare Turnstile site key. |
| `TURNSTILE_SECRET` | empty | Server-side Cloudflare Turnstile secret. Never expose it to the browser. |
| `NEXT_PUBLIC_SENTRY_DSN` | empty | Optional client telemetry DSN. |

`src/lib/env.ts` validates the environment at runtime. Turnstile and telemetry are disabled when their values are empty.

## Routes

| Route | Access | Purpose |
| --- | --- | --- |
| `/` | Public | Homepage. |
| `/telecharger` | Public | Ryujinx Nextendo downloads. |
| `/status` | Public | Live server status. |
| `/login` | Public | Sign in. |
| `/register` | Public | Create an account. |
| `/forgot`, `/reset`, `/verify` | Public | Account recovery and verification. |
| `/compte` | Authenticated | Account dashboard. |
| `/sessions` | Authenticated | Active session management. |
| `/api/health` | Public | Application health probe. |
| `/api/cloud-saves/[titleId]` | Authenticated | Cloud-save API route. |

URLs remain clean in the browser. The locale is resolved by the Next.js 16 proxy and the `nx_lang` cookie rather than being added as a visible path prefix.

## Repository layout

```text
src/
  app/
    [locale]/             Locale-aware pages and layouts
    api/                   Health and cloud-save route handlers
    sitemap.ts             Sitemap with locale alternates
    robots.ts              Robots metadata
  components/
    layout/               Public and authenticated site chrome
    home/                 Homepage sections
    auth/                 Authentication forms and shell
    dashboard/            Account, friends, sessions and saves UI
  i18n/                   Locale configuration, routing and actions
  lib/                    API client, environment, schemas and helpers
  server/                 Server Actions for auth, account, sessions and saves
  proxy.ts                next-intl request proxy
messages/                 10 nested locale dictionaries
public/                   Public assets (currently favicon.svg)
Legacy/                   Historical vanilla-JS implementation during cutover
Dockerfile                Standalone production image
DEPLOY.md                 Deployment, reverse proxy and rollback guide
LICENSE.md                PolyForm Shield 1.0.0 license
```

## Quality checks

```bash
pnpm run lint
pnpm run typecheck
pnpm run test
pnpm run build
```

The unit-test suite currently contains 124 tests. E2E tests require Chromium and an account-service test backend; the local mock helpers referenced by `playwright.config.ts` are not tracked in the public repository.

```bash
pnpm run test:e2e:install
pnpm run test:e2e
```

## Production and Docker

Next.js is configured with `output: 'standalone'`.

```bash
pnpm install --frozen-lockfile
pnpm run build
PORT=3000 node .next/standalone/server.js
```

Build and run the production container with:

```bash
docker build -t nextendo-site:latest .
docker run --rm -p 3000:3000 \
  -e NEXT_PUBLIC_SITE_URL=https://nextendo.network \
  -e NODE_ENV=production \
  nextendo-site:latest
```

Check the application health endpoint:

```bash
curl -s http://localhost:3000/api/health
```

For nginx proxying, the Go API boundary, cutover and rollback steps, see [DEPLOY.md](DEPLOY.md) and [deploy/README.md](deploy/README.md).

## Backend boundary

The private `nextendo-account` Go service is reached through `/api/*`. Requests are centralized in `src/lib/api.ts`, which provides typed responses, five-second request timeouts and GitHub release URL validation. Server Actions use the typed auth results to handle success and failure states without exposing backend implementation details to the UI.

## Contributing

Before opening a pull request:

1. Keep changes scoped to the relevant feature.
2. Run `pnpm run lint`, `pnpm run typecheck` and `pnpm run test`.
3. Run the relevant E2E tests when changing authenticated flows or page behavior.
4. Update all 10 message dictionaries when adding user-facing translations.
5. Do not commit secrets, private backend code or local validation helpers.

For questions, bug reports and community support, use the [Nextendo Discord server](https://discord.gg/XPfeCMwnzQ).

## License

This source is available under the [PolyForm Shield License 1.0.0](LICENSE.md). It permits reading, modifying and self-hosting for permitted purposes, but prohibits using the software to provide a competing product or service. Preserve `LICENSE.md` and the required copyright notices when distributing copies or derived works.

---

<div align="center">
<sub><b>Nextendo Network Team</b> · Kazuals - founder &amp; developer</sub>
</div>
