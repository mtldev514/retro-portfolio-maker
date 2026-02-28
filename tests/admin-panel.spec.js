// @ts-check
const { test, expect } = require('@playwright/test');

test.describe('Admin panel', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('.gallery-item', { timeout: 10000 });
  });

  test('Ctrl+Shift+A navigates to admin.html on localhost', async ({ page }) => {
    // Use evaluate to dispatch keyboard event directly — more reliable in headless CI
    await page.evaluate(() => {
      document.dispatchEvent(new KeyboardEvent('keydown', {
        key: 'a',
        code: 'KeyA',
        ctrlKey: true,
        shiftKey: true,
        bubbles: true
      }));
    });
    await page.waitForURL('**/admin.html', { timeout: 5000 });
    expect(page.url()).toContain('admin.html');
  });

  test('language button shows flag emoji (not gear icon)', async ({ page }) => {
    const btnText = await page.locator('#lang-btn-flag').textContent();
    expect(btnText).not.toBe('⚙');
    expect(btnText?.trim().length).toBeGreaterThan(0);
  });
});
