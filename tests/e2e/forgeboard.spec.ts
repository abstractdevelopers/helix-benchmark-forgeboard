import { test, expect } from '@playwright/test'

test.describe('ForgeBoard E2E', () => {
  test('user can register, create project, and add tasks', async ({ page }) => {
    await page.goto('/')
    await expect(page).toHaveTitle(/ForgeBoard/)

    await page.click('text=Sign Up')
    await expect(page).toHaveURL(/.*\/register/)

    await page.fill('input[type="text"]', 'Test User')
    await page.fill('input[type="email"]', `test-${Date.now()}@example.com`)
    await page.fill('input[type="password"]', 'password123')
    await page.click('button[type="submit"]')

    await expect(page).toHaveURL(/.*\/dashboard/, { timeout: 10000 })

    await page.click('text=New Project')
    await page.fill('input[type="text"]', 'Test Project')
    await page.locator('textarea').fill('A test project')
    await page.click('button:has-text("Create")')

    await page.waitForSelector('text=Test Project', { timeout: 5000 })

    await page.click('a:has-text("View")')
    await page.waitForSelector('text=Test Project', { timeout: 5000 })

    await page.click('text=New Task')
    await page.fill('input[placeholder="Task title"]', 'Test Task')
    await page.click('button:has-text("Create")')

    await page.waitForSelector('text=Test Task', { timeout: 5000 })

    await page.selectOption('select', { label: 'In Progress' })

    const healthResponse = await page.goto('/api/health')
    expect(healthResponse?.status()).toBe(200)
    const healthData = await healthResponse?.json()
    expect(healthData?.status).toBe('ok')

    await page.click('text=Logout')
    await expect(page).toHaveURL(/.*\//)
  })
})