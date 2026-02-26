// @ts-check
const { test, expect } = require('@playwright/test');

/**
 * Regression: Bug #6 — Filter buttons didn't match categories.json
 */
test.describe('Category filtering', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('.gallery-item', { timeout: 10000 });
  });

  test('clicking a filter shows only that category', async ({ page }) => {
    // Click the "painting" filter
    await page.click('.filter-btn[data-filter="painting"]');
    await page.waitForTimeout(300); // Allow re-render

    const items = await page.locator('.gallery-item').all();
    expect(items.length).toBe(6); // We have 6 paintings

    // All visible items should be paintings
    for (const item of items) {
      const cat = await item.getAttribute('data-category');
      expect(cat).toBe('painting');
    }
  });

  test('clicking "all" shows all items (up to pageSize)', async ({ page }) => {
    // First filter to a category
    await page.click('.filter-btn[data-filter="music"]');
    await page.waitForTimeout(300);

    // Then click "all"
    await page.click('.filter-btn[data-filter="all"]');
    await page.waitForTimeout(300);

    const count = await page.locator('.gallery-item').count();
    expect(count).toBe(24); // pageSize = 24, total = 31
  });

  test('active filter button gets active class', async ({ page }) => {
    // "all" should be active initially
    const allBtn = page.locator('.filter-btn[data-filter="all"]');
    await expect(allBtn).toHaveClass(/active/);

    // Click photography filter
    await page.click('.filter-btn[data-filter="photography"]');
    await page.waitForTimeout(300);

    const photoBtn = page.locator('.filter-btn[data-filter="photography"]');
    await expect(photoBtn).toHaveClass(/active/);
    await expect(allBtn).not.toHaveClass(/active/);
  });

  test('each filter button maps to a real category', async ({ page }) => {
    const filterValues = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('.filter-btn'))
        .map(btn => btn.getAttribute('data-filter'));
    });

    expect(filterValues).toContain('all');
    expect(filterValues).toContain('painting');
    expect(filterValues).toContain('drawing');
    expect(filterValues).toContain('photography');
    expect(filterValues).toContain('sculpting');
    expect(filterValues).toContain('music');
    expect(filterValues).toContain('projects');
    expect(filterValues).toHaveLength(7);
  });
});
