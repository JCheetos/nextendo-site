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

  test('browser login carries the session into /compte and /sessions', async ({ page }) => {
    await context_addFr(page)
    await page.goto('/login')
    await page.getByLabel('Adresse e-mail').fill('yosoycheetos@outlook.com')
    await page.locator('#password').fill('Test123!')
    await page.locator('form.auth__form button[type="submit"]').click()

    await page.waitForURL(/\/compte$/)
    await expect(page.locator('.account')).toBeVisible()
    await expect(page.getByText('JCheetos').first()).toBeVisible()
    await expect(page.getByText('SW-2622-5979-6316').first()).toBeVisible()
    await expect(page.locator('.modal:not([hidden])')).toHaveCount(0)
    await page
      .getByRole('button', { name: /Éditer el perfil|Editar perfil|Éditer le profil/ })
      .click()
    await expect(page.getByRole('heading', { name: /Éditer|Editar/ })).toBeVisible()
    await expect(page.locator('.modal:not([hidden])')).toHaveCount(1)
    {
      const vp = page.viewportSize()
      const box = await page.locator('.modal:not([hidden]) .modal__panel').boundingBox()
      const cx = box.x + box.width / 2
      const cy = box.y + box.height / 2
      expect(Math.abs(cx - vp.width / 2)).toBeLessThan(8)
      expect(Math.abs(cy - vp.height / 2)).toBeLessThan(Math.max(16, vp.height * 0.03))
      const z = await page
        .locator('.modal:not([hidden])')
        .evaluate((el) => Number(window.getComputedStyle(el).zIndex))
      expect(z).toBeGreaterThan(100)
    }
    await page.keyboard.press('Escape')
    await expect(page.locator('.modal:not([hidden])')).toHaveCount(0)

    await page.goto('/sessions')
    await expect(page.locator('.sess-list')).toBeVisible()
    await expect(page.getByText('Navigateur').first()).toBeVisible()
  })

  async function browserLogin(page, locale = 'es') {
    await page
      .context()
      .addCookies([{ name: 'nx_lang', value: locale, domain: 'localhost', path: '/' }])
    await page.goto('/login')
    await page.locator('#login').fill('yosoycheetos@outlook.com')
    await page.locator('#password').fill('Test123!')
    await page.locator('form.auth__form button[type="submit"]').click()
    await page.waitForURL(/\/compte$/, { timeout: 15000 })
    await page.waitForSelector('.account', { timeout: 10000 })
  }

  test('change email modal is anchored to the viewport', async ({ page }) => {
    await browserLogin(page, 'es')
    await page.getByRole('button', { name: /Cambiar correo/i }).click()
    const modal = page.locator('.modal:not([hidden])')
    await expect(modal).toHaveCount(1)
    const vp = page.viewportSize()
    const container = await modal.boundingBox()
    expect(container.x).toBe(0)
    expect(container.y).toBe(0)
    expect(container.width).toBe(vp.width)
    expect(container.height).toBe(vp.height)
    const panel = await modal.locator('.modal__panel').boundingBox()
    const cx = panel.x + panel.width / 2
    const cy = panel.y + panel.height / 2
    expect(Math.abs(cx - vp.width / 2)).toBeLessThan(8)
    expect(Math.abs(cy - vp.height / 2)).toBeLessThan(Math.max(16, vp.height * 0.03))
    await page.keyboard.press('Escape')
  })

  test('modal backdrop covers the viewport with blur', async ({ page }) => {
    await browserLogin(page, 'es')
    await page.getByRole('button', { name: /Eliminar mi cuenta/i }).click()
    const modal = page.locator('.modal:not([hidden])')
    const container = await modal.boundingBox()
    const vp = page.viewportSize()
    expect(container.width).toBe(vp.width)
    expect(container.height).toBe(vp.height)
    // Verify the .modal:not([hidden]) rule declares backdrop-filter or
    // -webkit-backdrop-filter. Headless Chromium sometimes reports the
    // computed value as 'none' even when the rule is applied, so we check
    // the CSSOM directly.
    const ruleHasBlur = await modal.evaluate(() => {
      for (const sheet of Array.from(document.styleSheets)) {
        let rules: CSSRuleList | null
        try {
          rules = sheet.cssRules
        } catch {
          continue
        }
        if (!rules) continue
        for (const rule of Array.from(rules)) {
          if (!rule.cssText) continue
          if (rule.cssText.includes('.modal:not([hidden])')) {
            if (
              rule.cssText.includes('backdrop-filter') ||
              rule.cssText.includes('-webkit-backdrop-filter')
            ) {
              return true
            }
          }
        }
      }
      return false
    })
    expect(ruleHasBlur).toBe(true)
    await page.keyboard.press('Escape')
  })

  test('SV picker drag does not produce an infinite render loop', async ({ page }) => {
    await browserLogin(page, 'es')
    const errors = []
    page.on('console', (m) => {
      if (m.type() === 'error') errors.push(m.text())
    })
    page.on('pageerror', (err) => errors.push(err.message))
    await page.getByRole('button', { name: /Editar perfil/i }).click()
    await page.locator('.swatch--custom').click()
    const sv = page.locator('.cpick__sv')
    const box = await sv.boundingBox()
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
    await page.mouse.down()
    for (let i = 1; i <= 15; i++) {
      await page.mouse.move(
        box.x + box.width * (0.2 + 0.6 * (i / 15)),
        box.y + box.height * (0.8 - 0.6 * (i / 15)),
        { steps: 1 },
      )
    }
    await page.mouse.up()
    await page.waitForTimeout(300)
    expect(errors.some((e) => /Maximum update depth|too many re-renders/i.test(e))).toBe(false)
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
