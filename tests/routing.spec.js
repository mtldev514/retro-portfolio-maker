// @ts-check
const { test, expect } = require('@playwright/test');

test.describe('SPA routing', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('.gallery-item', { timeout: 10000 });
  });

  test('clicking a gallery item navigates to detail page', async ({ page }) => {
    const firstLink = page.locator('.gallery-link').first();
    const href = await firstLink.getAttribute('href');
    expect(href).toContain('detail.html');

    await firstLink.click();

    // URL should change to include detail.html
    await page.waitForTimeout(500);
    expect(page.url()).toContain('detail.html');
  });

  test('admin link href points to admin.html', async ({ page }) => {
    const href = await page.locator('.admin-link').getAttribute('href');
    expect(href).toBe('admin.html');
  });

  test('gallery links include from parameter', async ({ page }) => {
    const href = await page.locator('.gallery-link').first().getAttribute('href');
    expect(href).toContain('from=');
  });

  test('gallery links include id parameter', async ({ page }) => {
    const href = await page.locator('.gallery-link').first().getAttribute('href');
    expect(href).toContain('id=');
  });
});
