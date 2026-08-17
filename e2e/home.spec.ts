import { expect, test } from '@playwright/test'

test.beforeEach(async ({ context }) => {
  await context.clearCookies()
  await context.addCookies([{ name: 'nx_lang', value: 'fr', url: 'http://localhost:3000/' }])
})

test.describe('Home page', () => {
  test('renders the hero with the French marketing copy (default locale)', async ({ page }) => {
    await page.goto('/')

    await expect(page).toHaveTitle(/Nextendo Network/)

    await expect(page.getByRole('heading', { level: 1 })).toContainText(
      'Un réseau indépendant pour votre Switch.',
    )

    await expect(page.getByRole('link', { name: 'Créer mon compte' }).first()).toBeVisible()
    await expect(page.getByRole('link', { name: 'Comment ça marche' })).toBeVisible()
  })

  test('renders the lang switcher with the current locale label', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByRole('button', { name: 'Français', exact: true })).toBeVisible()
  })

  test('preserves the default French lang attribute', async ({ page }) => {
    await page.goto('/')
    await expect(page.locator('html')).toHaveAttribute('lang', 'fr')
  })

  test('renders in English when the nx_lang cookie is set', async ({ page, context }) => {
    await context.addCookies([{ name: 'nx_lang', value: 'en', url: 'http://localhost:3000/' }])
    await page.goto('/')

    await expect(page.locator('html')).toHaveAttribute('lang', 'en')
    await expect(page.getByRole('heading', { level: 1 })).toContainText(
      'An independent network for your Switch.',
    )
    await expect(
      page.getByRole('link', { name: 'Create my account', exact: true }).first(),
    ).toBeVisible()
  })

  test('switches to Arabic with RTL direction', async ({ page, context }) => {
    await context.addCookies([{ name: 'nx_lang', value: 'ar', url: 'http://localhost:3000/' }])
    await page.goto('/')

    await expect(page.locator('html')).toHaveAttribute('lang', 'ar')
    await expect(page.locator('html')).toHaveAttribute('dir', 'rtl')
  })

  test('renders all 8 main sections', async ({ page }) => {
    await page.goto('/')
    await expect(page.locator('section.hero')).toBeVisible()
    await expect(page.locator('section.statement')).toBeVisible()
    await expect(page.locator('#features')).toBeVisible()
    await expect(page.locator('#architecture')).toBeVisible()
    await expect(page.locator('#install')).toBeVisible()
    await expect(page.locator('.figures')).toBeVisible()
    await expect(page.locator('#progress')).toBeVisible()
    await expect(page.locator('#faq')).toBeVisible()
    await expect(page.locator('.cta')).toBeVisible()
  })

  test('shows the latest game progression values in descending order', async ({ page }) => {
    await page.goto('/')
    const items = page.locator('#progress-list .progress-item')
    await expect(items).toHaveCount(10)
    await expect(items.first()).toContainText("Luigi's Mansion 3")
    await expect(items.first()).toContainText('[100%]')
    await expect(items.filter({ hasText: 'Mario Party Jamboree' })).toContainText('[45%]')
  })
})

test.describe('Download page', () => {
  test('renders the three platform cards', async ({ page }) => {
    await page.goto('/telecharger')
    await expect(page.getByRole('heading', { level: 1 })).toContainText(
      'Télécharger Ryujinx Nextendo',
    )
    await expect(page.locator('.dl-card[data-platform="win"]')).toBeVisible()
    await expect(page.locator('.dl-card[data-platform="linux"]')).toBeVisible()
    await expect(page.locator('.dl-card[data-platform="mac"]')).toBeVisible()
  })

  test('falls back to the GitHub releases link when the API is unreachable', async ({ page }) => {
    await page.goto('/telecharger')
    const win = page.locator('.dl-card[data-platform="win"]')
    await expect(win).toHaveAttribute(
      'href',
      /github\.com\/NextendoNetwork\/Ryujinx-Nextendo\/releases/,
    )
  })
})

test.describe('Status page', () => {
  test('renders one row per game', async ({ page }) => {
    await page.goto('/status')
    await expect(page.getByRole('heading', { level: 1 })).toContainText('État')
    await expect(page.locator('.status-row')).toHaveCount(4)
  })

  test('shows the banner with the right state', async ({ page }) => {
    await page.goto('/status')
    // The banner always renders; its class depends on the API response.
    await expect(page.locator('#status-banner')).toBeVisible()
  })
})

test.describe('Sitemap + robots', () => {
  test('sitemap contains the public routes', async ({ request }) => {
    const res = await request.get('/sitemap.xml')
    expect(res.status()).toBe(200)
    const body = await res.text()
    expect(body).toContain('https://nextendo.network')
    expect(body).toContain('/telecharger')
    expect(body).toContain('/status')
  })

  test('sitemap emits hreflang alternates for every locale', async ({ request }) => {
    const res = await request.get('/sitemap.xml')
    const body = await res.text()
    for (const code of ['fr', 'en', 'es', 'pt', 'de', 'it', 'ru', 'zh', 'ja', 'ar']) {
      expect(body).toContain(`hreflang="${code}"`)
    }
    expect(body).toContain('hreflang="x-default"')
  })

  test('robots disallows /api/ and /admin/', async ({ request }) => {
    const res = await request.get('/robots.txt')
    expect(res.status()).toBe(200)
    const body = await res.text()
    expect(body).toContain('Disallow: /api/')
    expect(body).toContain('Disallow: /admin/')
  })
})

test.describe('SEO metadata', () => {
  test('homepage emits canonical + hreflang alternates for every locale', async ({ page }) => {
    await page.goto('/')
    const hreflangs = await page.locator('link[rel="alternate"][hreflang]').all()
    const codes = await Promise.all(hreflangs.map((l) => l.getAttribute('hreflang')))
    for (const code of ['fr', 'en', 'es', 'pt', 'de', 'it', 'ru', 'zh', 'ja', 'ar', 'x-default']) {
      expect(codes).toContain(code)
    }
    const canonical = await page.locator('link[rel="canonical"]').first().getAttribute('href')
    expect(canonical).toBe('https://nextendo.network')
  })

  test('homepage emits Open Graph + Twitter card metadata', async ({ page }) => {
    await page.goto('/')
    const ogTitle = await page.locator('meta[property="og:title"]').first().getAttribute('content')
    expect(ogTitle).toMatch(/Nextendo/)
    const ogType = await page.locator('meta[property="og:type"]').first().getAttribute('content')
    expect(ogType).toBe('website')
    const twitterCard = await page
      .locator('meta[name="twitter:card"]')
      .first()
      .getAttribute('content')
    expect(twitterCard).toBe('summary_large_image')
  })

  test('homepage emits Organization + SoftwareApplication JSON-LD', async ({ page }) => {
    await page.goto('/')
    const scripts = await page.locator('script[type="application/ld+json"]').all()
    expect(scripts.length).toBeGreaterThan(0)
    const blobs = await Promise.all(scripts.map((s) => s.textContent()))
    const joined = blobs.join('')
    expect(joined).toContain('"@type":"Organization"')
    expect(joined).toContain('"@type":"SoftwareApplication"')
    expect(joined).toContain('Ryujinx')
  })

  test('telecharger page sets a canonical URL', async ({ page }) => {
    await page.goto('/telecharger')
    const canonical = await page.locator('link[rel="canonical"]').first().getAttribute('href')
    expect(canonical).toBe('https://nextendo.network/telecharger')
  })

  test('status page sets a canonical URL', async ({ page }) => {
    await page.goto('/status')
    const canonical = await page.locator('link[rel="canonical"]').first().getAttribute('href')
    expect(canonical).toBe('https://nextendo.network/status')
  })

  test('login + register + forgot + verify pages are noindex', async ({ page }) => {
    for (const path of ['/login', '/register', '/forgot']) {
      await page.goto(path)
      const robots = await page.locator('meta[name="robots"]').first().getAttribute('content')
      expect(robots).toMatch(/noindex/)
    }
  })
})
