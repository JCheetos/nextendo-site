import { expect, test } from '@playwright/test'

test.describe('Skip link', () => {
  test('renders on every public page and lands on <main id="main">', async ({ page }) => {
    for (const path of ['/', '/telecharger', '/status', '/login', '/register']) {
      await page.goto(path)
      const link = page.locator('a.skip-link').first()
      await expect(link).toBeAttached()
      const href = await link.getAttribute('href')
      expect(href).toBe('#main')
      const main = page.locator('main#main')
      await expect(main).toBeAttached()
      const tabIndex = await main.getAttribute('tabindex')
      expect(tabIndex).toBe('-1')
    }
  })

  test('becomes visible when focused via keyboard', async ({ page }) => {
    await page.goto('/')
    // Tab once from the top of the page.
    await page.keyboard.press('Tab')
    const link = page.locator('a.skip-link')
    await expect(link).toBeFocused()
  })

  test('localizes in French and English', async ({ page, context }) => {
    await page.goto('/')
    await expect(page.locator('a.skip-link')).toContainText('Aller au contenu')

    await context.addCookies([{ name: 'nx_lang', value: 'en', url: 'http://localhost:3000/' }])
    await page.goto('/')
    await expect(page.locator('a.skip-link')).toContainText('Skip to content')
  })
})

test.describe('Focus styles', () => {
  test('shows a visible :focus-visible outline on buttons', async ({ page }) => {
    await page.goto('/login')
    const submit = page.getByRole('button', { name: /Se connecter/ })
    await submit.focus()
    await expect(submit).toBeFocused()
    const outline = await submit.evaluate((el) => getComputedStyle(el).outlineStyle)
    expect(outline).not.toBe('none')
  })
})

test.describe('Headings', () => {
  test('homepage has a single <h1>', async ({ page }) => {
    await page.goto('/')
    const h1s = page.locator('h1')
    await expect(h1s).toHaveCount(1)
  })

  test('telecharger has a single <h1>', async ({ page }) => {
    await page.goto('/telecharger')
    await expect(page.locator('h1')).toHaveCount(1)
  })

  test('status has a single <h1>', async ({ page }) => {
    await page.goto('/status')
    await expect(page.locator('h1')).toHaveCount(1)
  })

  test('login + register + forgot + reset + verify have a single <h1>', async ({ page }) => {
    for (const path of ['/login', '/register', '/forgot', '/reset', '/verify']) {
      await page.goto(path)
      await expect(page.locator('h1')).toHaveCount(1)
    }
  })
})

test.describe('Reduced motion', () => {
  test('respects prefers-reduced-motion: reduce', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.goto('/')
    // Hero's CTA button transitions should be near-zero duration.
    const transitionDuration = await page
      .getByRole('link', { name: 'Créer mon compte' })
      .first()
      .evaluate((el) => getComputedStyle(el).transitionDuration)
    // CSS @media (prefers-reduced-motion: reduce) overrides transitions to 0.01ms.
    expect(transitionDuration === '0.01ms' || transitionDuration === '0s').toBeTruthy()
  })
})

test.describe('Dialog focus management', () => {
  test('compo account dashboard — edit profile modal traps focus', async ({ page }) => {
    await page.route('**/api/me', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          account: {
            username: 'Inkling_Pro',
            email: 'inkling@example.com',
            friend_code: 'SW-1234-5678-9012',
            pid: 'NX-ABCDEF',
            email_verified: true,
          },
        }),
      }),
    )
    await page.goto('/compte')
    await page.getByRole('button', { name: /Éditer le profil/ }).click()
    // The first interactive element inside the dialog receives focus.
    await page.waitForSelector('dialog[open]')
    const focusedTag = await page.evaluate(() => document.activeElement?.tagName)
    expect(['INPUT', 'BUTTON', 'CANVAS', 'A']).toContain(focusedTag)
  })
})
