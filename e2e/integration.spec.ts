import { expect, test } from '@playwright/test'

// Integration tests — exercise the REAL bundle against the REAL mock
// account server (started by playwright.config.ts as a webServer). No
// page.route() calls; the browser actually fetches through Next.js dev
// server → next.config.ts rewrites() → mock-account-server.mjs. This
// catches bugs that page.route() interceptors hide: cookies, redirects,
// server-action wire format, AbortController timing, etc.
//
// Every test:
//  1. POSTs /__mock/reset to start from a clean fixture state.
//  2. Sets the nx_lang=fr cookie so labels are in French (Playwright's
//     default browser locale is en, which would otherwise hide the form
//     inputs behind an English translation).
//
// SCOPE: these tests focus on PUBLIC endpoints and the wiring itself.
// Authenticated endpoints (which require the cookie flow + the
// /compte + /sessions dashboards) are covered by e2e/compte.spec.ts
// and e2e/sessions.spec.ts via page.route() — they're more reliable
// for the dashboard-specific assertions.
//
// Why not test authenticated flow here too? Next.js's internal
// rewrites() do NOT propagate the browser's cookies to the proxied
// request, so a pre-set nx_session cookie in the browser context
// doesn't reach mock-account-server. In production this works because
// nginx is in front of both Next.js and the Go backend at the same
// level — cookies flow naturally. To replicate that locally would
// require a sidecar reverse proxy (overkill for these tests).

test.describe('Integration — real bundle + mock backend', () => {
  test.beforeEach(async ({ request }) => {
    await request.post('http://localhost:8080/__mock/reset')
  })

  test('GET /api/site-config is reachable via the same-origin rewrite', async ({ page }) => {
    // The /status page imports fetchOnlineCounts from /api/online-counts,
    // which should hit the mock through the rewrite.
    await context_addFr(page)
    await page.goto('/status')
    await expect(page.locator('h1')).toContainText(/État|Status/i)
    await expect(page.locator('#status-banner')).toBeVisible()
    await expect(page.locator('.status-row')).toHaveCount(4)
  })

  test('GET /api/online-counts returns the mock data', async ({ request }) => {
    // Direct API call via Playwright's request fixture (no browser).
    // The browser's auth state isn't needed for this public endpoint.
    const res = await request.get('http://localhost:3000/api/online-counts')
    expect(res.status()).toBe(200)
    const body = await res.json()
    expect(body.counts).toMatchObject({ splatoon: 12, mk8: 8 })
  })

  test('GET /api/gameinfo returns typed metadata from the mock', async ({ request }) => {
    const res = await request.get(
      'http://localhost:3000/api/gameinfo?title_id=0100000000010000&name=Splatoon%203',
    )
    expect(res.status()).toBe(200)
    const body = await res.json()
    expect(body.name).toBe('Splatoon 3')
    expect(body.genres).toContain('Action')
    expect(body.metacritic).toBe(83)
  })

  test('POST /api/login (correct creds) returns 200 + sets the cookie', async ({ request }) => {
    // Uses the production-captured fixture (yosoycheetos@outlook.com / Test123!).
    const res = await request.post('http://localhost:3000/api/login', {
      headers: { 'Content-Type': 'application/json' },
      data: JSON.stringify({ login: 'yosoycheetos@outlook.com', password: 'Test123!' }),
    })
    expect(res.status()).toBe(200)
    expect(res.headers()['set-cookie']).toContain('nx_session=')
    const body = await res.json()
    expect(body.account.username).toBe('JCheetos')
    expect(body.account.pid).toBe('1800003302')
    expect(body.account.friend_code).toBe('SW-2622-5979-6316')
    expect(body.nex_token).toBe('mock_nex_token')
  })

  test('POST /api/login (wrong creds) returns 401', async ({ request }) => {
    const res = await request.post('http://localhost:3000/api/login', {
      headers: { 'Content-Type': 'application/json' },
      data: JSON.stringify({ login: 'yosoycheetos@outlook.com', password: 'wrong' }),
    })
    expect(res.status()).toBe(401)
    const body = await res.json()
    expect(body.error).toBe('invalid_credentials')
  })

  test('mock reset between tests keeps the suite deterministic', async ({ request }) => {
    let res = await request.get('http://localhost:3000/api/online-counts')
    let body = await res.json()
    expect(body.counts).toMatchObject({ splatoon: 12, mk8: 8 })

    await request.post('http://localhost:8080/__mock/reset')

    res = await request.get('http://localhost:3000/api/online-counts')
    body = await res.json()
    expect(body.counts).toMatchObject({ splatoon: 12, mk8: 8 })
  })
})

async function context_addFr(page: import('@playwright/test').Page) {
  await page
    .context()
    .addCookies([{ name: 'nx_lang', value: 'fr', domain: 'localhost', path: '/' }])
}
