// @ts-check
const { test, expect } = require('@playwright/test');

test.describe('DOM structure', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('.gallery-item', { timeout: 10000 });
  });

  test('gallery items are rendered', async ({ page }) => {
    const count = await page.locator('.gallery-item').count();
    // We have 31 total items but pageSize is 24, so first page should show 24
    expect(count).toBe(24);
  });

  test('gallery items have data-category attributes', async ({ page }) => {
    const categories = await page.evaluate(() => {
      const items = document.querySelectorAll('.gallery-item');
      const cats = new Set();
      items.forEach(item => cats.add(item.getAttribute('data-category')));
      return [...cats].sort();
    });

    // With 24 items shown (sorted by date desc), we should see multiple categories
    expect(categories.length).toBeGreaterThanOrEqual(2);
  });

  test('filter bar exists with correct buttons', async ({ page }) => {
    const filterNav = page.locator('#filter-nav');
    await expect(filterNav).toBeVisible();

    const buttons = await page.locator('.filter-btn').count();
    expect(buttons).toBe(7); // "all" + 6 categories
  });

  test('settings dropdown contains all sections', async ({ page }) => {
    const sectionLabels = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('.settings-dropdown .settings-section-label'))
        .map(el => el.textContent.trim());
    });

    expect(sectionLabels).toContain('Effects');
    expect(sectionLabels).toContain('Theme');
    expect(sectionLabels).toContain('Language');
  });

  test('header title is rendered', async ({ page }) => {
    const title = await page.locator('#page-title').textContent();
    expect(title?.trim()).toBe('Test Portfolio');
  });

  test('marquee text is rendered', async ({ page }) => {
    const marquee = page.locator('marquee, .marquee, [class*="marquee"]');
    const count = await marquee.count();
    expect(count).toBeGreaterThanOrEqual(1);
  });
});
