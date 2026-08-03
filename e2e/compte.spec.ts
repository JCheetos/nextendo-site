import { expect, test } from '@playwright/test'

const MOCK_ACCOUNT = {
  username: 'Inkling_Pro',
  email: 'inkling@example.com',
  friend_code: 'SW-1234-5678-9012',
  pid: 'NX-ABCDEF',
  email_verified: true,
  is_guest: false,
}

const MOCK_FRIENDS = {
  friends: [
    {
      pid: 'NX-AAAAAA',
      username: 'Buddy_One',
      name: 'Buddy One',
      friend_code: 'SW-1111-1111-1111',
      color: '#36ce73',
      avatar: 'ph-cat',
      presence: { status: 1, app_id: '', app_detail: '' },
    },
    {
      pid: 'NX-BBBBBB',
      username: 'Buddy_Two',
      name: 'Buddy Two',
      friend_code: 'SW-2222-2222-2222',
      color: '#e4404a',
      avatar: 'ph-ghost',
      presence: { status: 0 },
    },
  ],
  requests: [
    {
      pid: 'NX-CCCCCC',
      username: 'Wannabe',
      friend_code: 'SW-3333-3333-3333',
      color: '#1ca9e0',
      avatar: 'ph-rocket',
    },
  ],
}

const MOCK_HISTORY = {
  history: [
    {
      title_id: '0100000000010000',
      name: 'Splatoon 3',
      seconds: 7200,
      last_played: '2025-12-01T18:00:00Z',
    },
    {
      title_id: '0100000000020000',
      name: 'Mario Kart 8 Deluxe',
      seconds: 1800,
      last_played: '2025-11-28T15:00:00Z',
    },
  ],
}

test.describe('Compte — auth guard', () => {
  test('redirects to /login when /api/me returns nothing', async ({ page }) => {
    await page.route('**/api/me', (route) => route.fulfill({ status: 401, body: '{}' }))
    await page.goto('/compte')
    await expect(page).toHaveURL(/\/login\?next=/)
    expect(page.url()).toContain('next=%2Fcompte')
  })

  test('redirects to /login when /api/me is unreachable', async ({ page }) => {
    await page.route('**/api/me', (route) => route.abort())
    await page.goto('/compte')
    await expect(page).toHaveURL(/\/login\?next=/)
  })
})

test.describe('Compte — authenticated', () => {
  test.beforeEach(async ({ page }) => {
    await page.route('**/api/me', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ account: MOCK_ACCOUNT }),
      }),
    )
    await page.route('**/api/friends', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(MOCK_FRIENDS),
      }),
    )
    await page.route('**/api/history', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(MOCK_HISTORY),
      }),
    )
    await page.goto('/compte')
  })

  test('renders the member card with the friend code', async ({ page }) => {
    await expect(page.locator('.account')).toBeVisible()
    await expect(page.getByText('Inkling_Pro').first()).toBeVisible()
    await expect(page.getByText('SW-1234-5678-9012').first()).toBeVisible()
    await expect(page.locator('.account__hi h1')).toContainText('Inkling_Pro')
  })

  test('does not show the verify banner when email is verified', async ({ page }) => {
    await expect(page.getByText(/Confirme ton adresse/)).toHaveCount(0)
  })

  test('shows the verify banner when email is not verified', async ({ page }) => {
    await page.unroute('**/api/me')
    await page.route('**/api/me', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ account: { ...MOCK_ACCOUNT, email_verified: false } }),
      }),
    )
    await page.goto('/compte')
    await expect(page.getByText(/Confirme ton adresse e-mail/)).toBeVisible()
  })

  test('renders the friends list with online + offline dots', async ({ page }) => {
    const friends = page.locator('[data-testid="friend-list"] .friend')
    await expect(friends).toHaveCount(2)
    await expect(page.getByText('Buddy_One').first()).toBeVisible()
    await expect(page.getByText('Buddy_Two').first()).toBeVisible()
  })

  test('renders the friend requests with accept/decline buttons', async ({ page }) => {
    const requests = page.locator('[data-testid="friend-requests"]')
    await expect(requests).toBeVisible()
    await expect(page.getByText('Wannabe').first()).toBeVisible()
    await expect(page.getByRole('button', { name: 'Accepter' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Refuser' })).toBeVisible()
  })

  test('renders the history cards', async ({ page }) => {
    const cards = page.locator('.history-card')
    await expect(cards).toHaveCount(2)
    await expect(page.getByText('Splatoon 3').first()).toBeVisible()
    await expect(page.getByText('Mario Kart 8 Deluxe').first()).toBeVisible()
  })

  test('opens and closes the edit profile modal', async ({ page }) => {
    await page.getByRole('button', { name: /Éditer le profil/ }).click()
    await expect(page.getByRole('heading', { name: 'Éditer le profil' })).toBeVisible()
    await expect(page.locator('[data-testid="color-swatches"]')).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(page.getByRole('heading', { name: 'Éditer le profil' })).toHaveCount(0)
  })

  test('opens and closes the change email modal', async ({ page }) => {
    await page.getByRole('button', { name: "Changer d'e-mail" }).click()
    await expect(page.getByRole('heading', { name: "Changer d'adresse e-mail" })).toBeVisible()
    await expect(page.getByLabel('Nouvelle adresse e-mail')).toBeVisible()
    await page.getByRole('button', { name: 'Annuler' }).first().click()
    await expect(page.getByRole('heading', { name: "Changer d'adresse e-mail" })).toHaveCount(0)
  })

  test('opens and closes the delete account modal', async ({ page }) => {
    await page.getByRole('button', { name: /Supprimer mon compte/ }).click()
    await expect(page.getByRole('heading', { name: 'Supprimer mon compte' })).toBeVisible()
    await expect(page.getByLabel(/Ton mot de passe, pour confirmer/)).toBeVisible()
    await page.getByRole('button', { name: 'Annuler' }).first().click()
    await expect(page.getByRole('heading', { name: 'Supprimer mon compte' })).toHaveCount(0)
  })

  test('the security panel links to /forgot and /sessions', async ({ page }) => {
    await expect(page.getByRole('link', { name: /Réinitialiser le mot de passe/ })).toHaveAttribute(
      'href',
      '/forgot',
    )
    await expect(page.getByRole('link', { name: /Mes sessions/ })).toHaveAttribute(
      'href',
      '/sessions',
    )
  })
})

test.describe('Compte — friend modal', () => {
  test('opens the friend modal and shows the playtime + games played stats', async ({ page }) => {
    await page.route('**/api/me', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ account: MOCK_ACCOUNT }),
      }),
    )
    await page.route('**/api/friends', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(MOCK_FRIENDS),
      }),
    )
    await page.route('**/api/friends/history*', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          history: [
            {
              title_id: '0100000000010000',
              name: 'Splatoon 3',
              seconds: 14400,
              last_played: '2025-12-05T18:00:00Z',
            },
          ],
        }),
      }),
    )
    await page.goto('/compte')
    await page.getByText('Buddy_One').first().click()
    await expect(page.getByRole('heading', { name: 'Buddy One' })).toBeVisible()
    await expect(page.getByText('Temps de jeu')).toBeVisible()
    await expect(page.getByText('Jeux joués')).toBeVisible()
  })
})

test.describe('Compte — i18n', () => {
  test('localizes in English when the cookie is set', async ({ page, context }) => {
    await context.addCookies([{ name: 'nx_lang', value: 'en', url: 'http://localhost:3000/' }])
    await page.route('**/api/me', (route) => route.fulfill({ status: 401, body: '{}' }))
    await page.goto('/compte')
    // We are redirected to /login. The locale should be 'en'.
    await expect(page.locator('html')).toHaveAttribute('lang', 'en')
  })
})
