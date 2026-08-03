import { expect, test } from '@playwright/test'

// Smoke tests: every public page returns 200 and renders its primary heading.
// Designed to run against any build (dev, prod, CI artifact). No mutations,
// no auth required.

test.describe('Smoke — public pages', () => {
  test('homepage returns 200 + h1', async ({ page }) => {
    const resp = await page.goto('/')
    expect(resp?.status()).toBeLessThan(400)
    await expect(page.locator('h1').first()).toBeVisible()
  })

  test('telecharger returns 200 + h1', async ({ page }) => {
    const resp = await page.goto('/telecharger')
    expect(resp?.status()).toBeLessThan(400)
    await expect(page.locator('h1').first()).toBeVisible()
  })

  test('status returns 200 + h1 (banner always renders)', async ({ page }) => {
    const resp = await page.goto('/status')
    expect(resp?.status()).toBeLessThan(400)
    await expect(page.locator('h1').first()).toBeVisible()
    // The banner is always present; its color depends on the backend state.
    await expect(page.locator('#status-banner')).toBeVisible()
  })

  test('login returns 200 + form', async ({ page }) => {
    const resp = await page.goto('/login')
    expect(resp?.status()).toBeLessThan(400)
    await expect(page.locator('h1').first()).toBeVisible()
  })

  test('register returns 200 + form', async ({ page }) => {
    const resp = await page.goto('/register')
    expect(resp?.status()).toBeLessThan(400)
    await expect(page.locator('h1').first()).toBeVisible()
  })

  test('forgot returns 200 + form', async ({ page }) => {
    const resp = await page.goto('/forgot')
    expect(resp?.status()).toBeLessThan(400)
    await expect(page.locator('h1').first()).toBeVisible()
  })

  test('compte + sessions redirect to /login when not authenticated', async ({ page }) => {
    for (const path of ['/compte', '/sessions']) {
      await page.goto(path)
      await expect(page).toHaveURL(/\/login\?next=/)
    }
  })
})

test.describe('Smoke — health endpoint', () => {
  test('GET /api/health returns 200 + JSON', async ({ request }) => {
    const res = await request.get('/api/health')
    expect(res.status()).toBe(200)
    const body = await res.json()
    expect(body.status).toBe('ok')
    expect(typeof body.uptime).toBe('number')
    expect(typeof body.now).toBe('string')
    expect(body.version).toMatch(/^\d+\.\d+\.\d+$/)
  })

  test('health response is not cached', async ({ request }) => {
    const a = await request.get('/api/health')
    const b = await request.get('/api/health')
    expect(a.headers()['cache-control']).toContain('no-store')
    expect(b.headers()['cache-control']).toContain('no-store')
    expect(a.status()).toBe(200)
    expect(b.status()).toBe(200)
  })
})

test.describe('Smoke — metadata endpoints', () => {
  test('sitemap.xml is well-formed XML with the public URLs', async ({ request }) => {
    const res = await request.get('/sitemap.xml')
    expect(res.status()).toBe(200)
    const body = await res.text()
    expect(body).toContain('<urlset')
    expect(body).toContain('https://nextendo.network')
    expect(body).toContain('/telecharger')
    expect(body).toContain('/status')
  })

  test('robots.txt allows everything except /api/ + /admin/', async ({ request }) => {
    const res = await request.get('/robots.txt')
    expect(res.status()).toBe(200)
    const body = await res.text()
    expect(body).toMatch(/Allow:\s*\//)
    expect(body).toMatch(/Disallow:\s*\/api\//)
    expect(body).toMatch(/Disallow:\s*\/admin\//)
  })
})

test.describe('Smoke — language switching', () => {
  test('setting nx_lang cookie switches the homepage to that locale', async ({ page, context }) => {
    for (const [code, expected] of [
      ['en', 'Skip to content'],
      ['es', 'Saltar al contenido'],
    ]) {
      await context.addCookies([{ name: 'nx_lang', value: code, url: 'http://localhost:3000/' }])
      await page.goto('/')
      await expect(page.locator('a.skip-link')).toContainText(expected)
    }
  })
})
