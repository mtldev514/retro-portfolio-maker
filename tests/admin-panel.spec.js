// @ts-check
const { test, expect } = require('@playwright/test');

/**
 * Regression: Bug #3 — Admin panel disappeared (wrapper div removed by sibling walker)
 * Regression: Bug #4 — Admin link intercepted by SPA router (missing target attr)
 */
test.describe('Admin panel', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('.gallery-item', { timeout: 10000 });
  });

  test('admin link is present on localhost', async ({ page }) => {
    const adminLink = page.locator('.admin-link');
    await expect(adminLink).toBeAttached();
  });

  test('admin link is direct child of settings-dropdown (Bug #3 regression)', async ({ page }) => {
    // The admin link should NOT be inside a wrapper div — it should be
    // a direct child of .settings-dropdown
    const parentClass = await page.evaluate(() => {
      const link = document.querySelector('.admin-link');
      return link?.parentElement?.className || '';
    });

    expect(parentClass).toContain('settings-dropdown');
  });

  test('admin link has target="_self" to bypass router (Bug #4 regression)', async ({ page }) => {
    const target = await page.locator('.admin-link').getAttribute('target');
    expect(target).toBe('_self');
  });

  test('Development section label exists', async ({ page }) => {
    const devLabel = await page.evaluate(() => {
      const labels = document.querySelectorAll('.settings-dropdown .settings-section-label');
      return Array.from(labels).some(l => l.textContent.trim() === 'Development');
    });

    expect(devLabel).toBe(true);
  });

  test('admin divider is direct child of settings-dropdown', async ({ page }) => {
    // The settings-divider before the Development section should be a direct child
    const isDirect = await page.evaluate(() => {
      const dropdown = document.querySelector('.settings-dropdown');
      if (!dropdown) return false;
      const dividers = dropdown.querySelectorAll(':scope > .settings-divider');
      return dividers.length > 0;
    });

    expect(isDirect).toBe(true);
  });
});
