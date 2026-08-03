import { expect, test } from '@playwright/test'

test.describe('Login page', () => {
  test('renders the login form with all fields', async ({ page }) => {
    await page.goto('/login')
    await expect(page.getByRole('heading', { name: 'Connexion' })).toBeVisible()
    await expect(page.getByLabel('Adresse e-mail')).toBeVisible()
    await expect(page.getByLabel('Mot de passe', { exact: true })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Mot de passe oublié ?' })).toBeVisible()
    await expect(page.getByRole('button', { name: /Se connecter/ })).toBeVisible()
  })

  test('renders in English when the cookie is set', async ({ page, context }) => {
    await context.addCookies([{ name: 'nx_lang', value: 'en', url: 'http://localhost:3000/' }])
    await page.goto('/login')
    await expect(page.locator('html')).toHaveAttribute('lang', 'en')
    await expect(page.getByRole('button', { name: /Log in/ })).toBeVisible()
  })

  test('shows client-side validation on empty submit', async ({ page }) => {
    await page.goto('/login')
    await page.getByRole('button', { name: /Se connecter/ }).click()
    // Form should not have submitted (still on /login).
    await expect(page).toHaveURL(/\/login$/)
  })
})

test.describe('Register page', () => {
  test('renders the register form with all fields', async ({ page }) => {
    await page.goto('/register')
    await expect(page.getByRole('heading', { name: 'Créer un compte' })).toBeVisible()
    await expect(page.getByLabel('Pseudo (nom affiché)')).toBeVisible()
    await expect(page.getByLabel('E-mail')).toBeVisible()
    await expect(page.getByLabel('Mot de passe', { exact: true })).toBeVisible()
    await expect(page.getByLabel('Confirme le mot de passe')).toBeVisible()
    await expect(page.getByRole('button', { name: /Créer mon compte/ })).toBeVisible()
  })

  test('shows the password requirements checklist', async ({ page }) => {
    await page.goto('/register')
    await expect(page.getByText('Au moins 8 caractères').first()).toBeVisible()
    await expect(page.getByText('Au moins un chiffre').first()).toBeVisible()
    await expect(page.getByText('Au moins un caractère spécial (! @ # $ …)').first()).toBeVisible()
  })

  test('shows the sign-ups closed notice when /api/site-config reports closed', async ({
    page,
  }) => {
    await page.route('**/api/site-config', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ registration_open: false }),
      }),
    )
    await page.goto('/register')
    await expect(page.getByText('Inscriptions temporairement fermées.')).toBeVisible()
  })

  test('renders the form open by default when /api/site-config is unreachable', async ({
    page,
  }) => {
    await page.route('**/api/site-config', (route) => route.abort())
    await page.goto('/register')
    await expect(page.getByLabel('Pseudo (nom affiché)')).toBeVisible()
  })
})

test.describe('Forgot page', () => {
  test('renders the forgot form', async ({ page }) => {
    await page.goto('/forgot')
    await expect(page.getByRole('heading', { name: 'Réinitialiser' })).toBeVisible()
    await expect(page.getByLabel('Adresse e-mail')).toBeVisible()
    await expect(page.getByRole('button', { name: /Envoyer le lien/ })).toBeVisible()
  })
})

test.describe('Reset page', () => {
  test('renders the reset form when token is provided', async ({ page }) => {
    await page.goto('/reset?token=abc123')
    await expect(page.getByRole('heading', { name: 'Nouveau mot de passe' })).toBeVisible()
    await expect(page.getByLabel('Nouveau mot de passe')).toBeVisible()
    await expect(page.getByLabel('Confirme le mot de passe')).toBeVisible()
    await expect(page.getByRole('button', { name: /Enregistrer le mot de passe/ })).toBeVisible()
  })

  test('shows the no-token error when token is missing', async ({ page }) => {
    await page.goto('/reset')
    await expect(page.getByText(/Lien invalide/)).toBeVisible()
  })
})

test.describe('Verify page', () => {
  test('shows the verification failed state when no token is provided', async ({ page }) => {
    await page.goto('/verify')
    await expect(page.getByText(/Lien invalide|jeton/)).toBeVisible()
  })

  test('shows the verification failed state when the backend is unreachable', async ({ page }) => {
    await page.route('**/api/verify*', (route) => route.abort())
    await page.goto('/verify?token=anything')
    await expect(page.getByText(/Lien invalide|expired|jeton/)).toBeVisible()
  })

  test('falls back to the login link when verification fails', async ({ page }) => {
    await page.goto('/verify?token=invalid-token')
    await expect(page.getByRole('link', { name: /Se connecter/ })).toBeVisible()
  })
})

test.describe('Auth pages — i18n', () => {
  test('login page localizes when cookie is set to ar (RTL)', async ({ page, context }) => {
    await context.addCookies([{ name: 'nx_lang', value: 'ar', url: 'http://localhost:3000/' }])
    await page.goto('/login')
    await expect(page.locator('html')).toHaveAttribute('lang', 'ar')
    await expect(page.locator('html')).toHaveAttribute('dir', 'rtl')
  })

  test('register page keeps the link to login', async ({ page }) => {
    await page.goto('/register')
    await expect(page.getByRole('link', { name: 'Se connecter' })).toBeVisible()
  })
})
