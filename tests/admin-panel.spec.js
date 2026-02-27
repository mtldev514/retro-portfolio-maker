// @ts-check
const { test, expect } = require('@playwright/test');

/**
 * Admin panel access via Ctrl+Shift+A keyboard shortcut (localhost only).
 * Replaces the old dropdown-based admin link (Bugs #3, #4).
 */
test.describe('Admin panel', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('.gallery-item', { timeout: 10000 });
  });

  test('Ctrl+Shift+A navigates to admin.html on localhost', async ({ page }) => {
    // The dev server runs on localhost, so the shortcut should be active
    await page.keyboard.press('Control+Shift+A');
    await page.waitForURL('**/admin.html', { timeout: 5000 });
    expect(page.url()).toContain('admin.html');
  });

  test('admin link is no longer in settings dropdown', async ({ page }) => {
    const adminLink = page.locator('.admin-link');
    await expect(adminLink).toHaveCount(0);
  });

  test('Development section label no longer exists', async ({ page }) => {
    const devLabel = await page.evaluate(() => {
      const labels = document.querySelectorAll('.settings-dropdown .settings-section-label');
      return Array.from(labels).some(l => l.textContent.trim() === 'Development');
    });

    expect(devLabel).toBe(false);
  });

  test('settings dropdown only contains Language section', async ({ page }) => {
    const sections = await page.evaluate(() => {
      const labels = document.querySelectorAll('.settings-dropdown .settings-section-label');
      return Array.from(labels).map(l => l.textContent.trim());
    });

    expect(sections).toEqual(['Language']);
  });

  test('language button shows flag emoji (not gear icon)', async ({ page }) => {
    const btnText = await page.locator('#lang-btn-flag').textContent();
    // Should be a flag emoji, not the gear ⚙
    expect(btnText).not.toBe('⚙');
    expect(btnText?.trim().length).toBeGreaterThan(0);
  });
});
