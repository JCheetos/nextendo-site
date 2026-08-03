import { z } from 'zod'

// Environment schema. All public vars are opt-in (defaults to empty/disabled)
// so the front-end can boot in dev or unit-test contexts without them. CI /
// staging / production should set the full set explicitly.
//
// We deliberately keep the runtime surface tiny: we never read process.env
// outside this module so a server bundle does not accidentally leak a secret.
const Env = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),

  // Optional: the Go account service. When empty, the front-end talks to
  // the same origin (relies on the reverse proxy).
  NEXTENDO_ACCOUNT_BASE_URL: z.string().optional().default(''),

  // Optional: Cloudflare Turnstile sitekey (consumed by /auth components).
  NEXT_PUBLIC_TURNSTILE_SITEKEY: z.string().optional().default(''),

  // Optional: server-side Turnstile secret (NEVER exposed to the browser;
  // only read from Server Components). When empty, the Turnstile check is a
  // no-op (dev/test builds).
  TURNSTILE_SECRET: z.string().optional().default(''),

  // Optional: Sentry-style DSN for client telemetry. Empty by default.
  NEXT_PUBLIC_SENTRY_DSN: z.string().optional().default(''),

  // Where the canonical origin lives. Override per-environment (staging vs.
  // production) so the sitemap + hreflang produce the right URLs.
  NEXT_PUBLIC_SITE_URL: z
    .string()
    .optional()
    .default('https://nextendo.network')
    .refine((s) => /^https?:\/\//.test(s), {
      message: 'NEXT_PUBLIC_SITE_URL must be a fully-qualified URL',
    }),
})

export type Env = z.infer<typeof Env>

let cached: Env | null = null

/**
 * Lazily parse and cache the environment. We intentionally cache because
 * `process.env` is mutable in dev (e.g. via `.env.local` reload); cache keys
 * are not used in production.
 */
export function getEnv(): Env {
  if (cached) return cached
  const parsed = Env.safeParse(process.env)
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((i) => `${i.path.join('.') || '(root)'}: ${i.message}`)
      .join('; ')
    throw new Error(`Invalid environment: ${issues}`)
  }
  cached = parsed.data
  return cached
}

/** Test-only: reset the cache between unit tests. */
export function __resetEnvForTests() {
  cached = null
}
