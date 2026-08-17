import { expect, test } from '@playwright/test'
import { loginAndShareCookie } from './auth'

test.describe('Cloud saves', () => {
  test.beforeEach(async ({ page, context, request }) => {
    await request.post('http://localhost:8080/__mock/reset')
    await loginAndShareCookie(request, context)
    await page.goto('/compte')
  })

  test('renders the save list and quota', async ({ page }) => {
    const panel = page.locator('.cloud-saves-panel')
    await expect(panel).toBeVisible()
    await expect(panel.getByRole('heading', { name: 'Sauvegardes cloud' })).toBeVisible()
    await expect(panel.getByText('Splatoon 2')).toBeVisible()
    await expect(panel.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '786432')
  })

  test('downloads a save through the same-origin route handler', async ({ page }) => {
    const response = await page.request.get('/api/cloud-saves/0100000000010000')
    expect(response.status()).toBe(200)
    expect(response.headers()['content-type']).toBe('application/octet-stream')
    expect(await response.body()).toEqual(Buffer.from('mock-splatoon-save'))
  })

  test('deletes a save after explicit confirmation', async ({ page }) => {
    const panel = page.locator('.cloud-saves-panel')
    await panel.getByRole('button', { name: 'Aperçu' }).first().click()
    await expect(page.locator('#save-title')).toHaveText('Splatoon 2')
    const dialog = page.getByRole('dialog')
    await dialog.getByRole('button', { name: 'Supprimer', exact: true }).click()
    await dialog.getByRole('button', { name: 'Confirmer la suppression' }).click()
    await expect(panel.getByText('Splatoon 2')).toHaveCount(0)
  })
})
