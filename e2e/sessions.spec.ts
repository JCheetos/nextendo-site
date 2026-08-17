import { expect, test } from '@playwright/test'
import { loginAndShareCookie } from './auth'

const MOCK_ACCOUNT = {
  username: 'Inkling_Pro',
  email: 'inkling@example.com',
  friend_code: 'SW-1234-5678-9012',
  pid: 'NX-ABCDEF',
  email_verified: true,
  is_guest: false,
}

const MOCK_SESSIONS = {
  sessions: [
    {
      id: 'sess_current',
      kind: 'browser',
      kind_label: 'Navigateur',
      current: true,
      ip: '127.0.0.1',
      geo: 'Paris',
      last_seen: new Date().toISOString(),
    },
    {
      id: 'sess_other',
      kind: 'ryujinx',
      kind_label: 'Ryujinx',
      current: false,
      playing: true,
      ip: '10.0.0.5',
      last_seen: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
    },
  ],
}

test.describe('Sessions — auth guard', () => {
  test('redirects to /login when /api/me returns nothing', async ({ page }) => {
    await page.route('**/api/me', (route) => route.fulfill({ status: 401, body: '{}' }))
    await page.goto('/sessions')
    await expect(page).toHaveURL(/\/login\?next=/)
    expect(page.url()).toContain('next=%2Fsessions')
  })

  test('redirects to /login when /api/me is unreachable', async ({ page }) => {
    await page.route('**/api/me', (route) => route.abort())
    await page.goto('/sessions')
    await expect(page).toHaveURL(/\/login\?next=/)
  })
})

test.describe('Sessions — authenticated', () => {
  test.beforeEach(async ({ page, context, request }) => {
    await request.post('http://localhost:8080/__mock/reset')
    await loginAndShareCookie(request, context)
    await request.post('http://localhost:8080/__mock/patch', {
      data: {
        account: MOCK_ACCOUNT,
        sessions: MOCK_SESSIONS.sessions,
      },
    })
    await page.goto('/sessions')
  })

  test('renders the page title and intro', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Sessions actives' })).toBeVisible()
    await expect(page.getByText('Chaque appareil connecté')).toBeVisible()
  })

  test('renders the current session first with the "cet appareil" badge', async ({ page }) => {
    const list = page.locator('[data-testid="sessions"]')
    await expect(list).toBeVisible()
    const rows = list.locator('.sess')
    await expect(rows).toHaveCount(2)
    // Current session is sorted first.
    await expect(rows.nth(0)).toContainText('cet appareil')
    await expect(rows.nth(0)).toContainText('Me déconnecter')
  })

  test('renders the non-current session with the playing badge', async ({ page }) => {
    const rows = page.locator('[data-testid="sessions"] .sess')
    await expect(rows.nth(1)).toContainText('en jeu')
    await expect(rows.nth(1)).toContainText('Déconnecter')
  })

  test('opens the confirm modal when clicking disconnect', async ({ page }) => {
    const firstRow = page.locator('[data-testid="sessions"] .sess').first()
    await firstRow.locator('button').click()
    await expect(
      page.getByRole('heading', {
        name: /Te déconnecter de cet appareil|Déconnecter cet appareil/,
      }),
    ).toBeVisible()
  })

  test('shows the close-all button with its hint', async ({ page }) => {
    await expect(page.getByRole('button', { name: /Fermer toutes les sessions/ })).toBeVisible()
    await expect(page.getByText(/« Fermer toutes les sessions »/)).toBeVisible()
  })

  test('renders the empty state when /api/sessions returns nothing', async ({ page }) => {
    await page.request.post('http://localhost:8080/__mock/patch', {
      data: { sessions: [] },
    })
    await page.goto('/sessions')
    await expect(page.getByText('Aucune session active.')).toBeVisible()
  })

  test('renders the error state when /api/sessions fails', async ({ page }) => {
    await page.route('**/api/sessions', (route) =>
      route.fulfill({ status: 503, contentType: 'application/json', body: '{}' }),
    )
    await page.reload()
    await expect(page.locator('output[role="alert"]')).toHaveText(
      'Impossible de charger les sessions.',
    )
  })
})
