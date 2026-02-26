// @ts-check
const { test, expect } = require('@playwright/test');

/**
 * Regression: Bug #5 — config-source.json 404 caused console JSON parse errors
 * Also catches any unexpected console errors across the app.
 */
test.describe('Console errors', () => {
  test('page loads without console errors', async ({ page }) => {
    /**
     * @type {string[]}
     */
    const errors = [];

    page.on('pageerror', err => {
      errors.push(err.message);
    });

    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    await page.goto('/');
    // Wait for the app to fully initialize (renderer fetches data via fetch())
    await page.waitForSelector('.gallery-item', { timeout: 10000 });

    // Filter out known non-critical messages (counter API may fail in test env)
    const critical = errors.filter(e =>
      !e.includes('counterapi') &&
      !e.includes('Failed to fetch') &&
      !e.includes('ERR_CONNECTION_REFUSED')
    );

    expect(critical).toEqual([]);
  });

  test('no JSON parse errors (Bug #5 regression)', async ({ page }) => {
    /**
     * @type {any[]}
     */
    const jsonErrors = [];

    page.on('pageerror', err => {
      if (err.message.includes('SyntaxError') || err.message.includes('JSON')) {
        jsonErrors.push(err.message);
      }
    });

    page.on('console', msg => {
      const text = msg.text();
      if (text.includes('SyntaxError') || text.includes('JSON.parse') || text.includes('Unexpected token')) {
        jsonErrors.push(text);
      }
    });

    await page.goto('/');
    await page.waitForSelector('.gallery-item', { timeout: 10000 });

    expect(jsonErrors).toEqual([]);
  });

  test('no 404 responses for app resources', async ({ page }) => {
    /**
     * @type {any[]}
     */
    const notFound = [];

    page.on('response', response => {
      const url = response.url();
      // Only check our own resources, not external (picsum, soundhelix, etc.)
      if (url.includes('localhost') && response.status() === 404) {
        notFound.push(url);
      }
    });

    await page.goto('/');
    await page.waitForSelector('.gallery-item', { timeout: 10000 });

    expect(notFound).toEqual([]);
  });
});
