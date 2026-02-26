// @ts-check
const { test, expect } = require('@playwright/test');

test.describe('Pagination', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('.gallery-item', { timeout: 10000 });
  });

  test('initial page shows exactly pageSize items', async ({ page }) => {
    const count = await page.locator('.gallery-item').count();
    expect(count).toBe(24); // pageSize = 24
  });

  test('load more button appears when items exceed pageSize', async ({ page }) => {
    const loadMore = page.locator('#load-more-btn');
    await expect(loadMore).toBeAttached();

    const text = await loadMore.textContent();
    expect(text).toContain('7 remaining'); // 31 - 24 = 7
  });

  test('clicking load more shows remaining items', async ({ page }) => {
    // Use evaluate to click — avoids Playwright's actionability checks
    // which can race with the gallery re-render that detaches the button
    await page.evaluate(() => {
      const btn = document.getElementById('load-more-btn');
      if (btn) btn.click();
    });
    await page.waitForTimeout(500);

    const count = await page.locator('.gallery-item').count();
    expect(count).toBe(31); // All 31 items shown

    // Load more button should be gone now
    const loadMore = page.locator('#load-more-btn');
    await expect(loadMore).not.toBeAttached();
  });

  test('filtered category with fewer items has no load more', async ({ page }) => {
    // Music only has 3 items (well under 24)
    await page.click('.filter-btn[data-filter="music"]');
    await page.waitForTimeout(300);

    const count = await page.locator('.gallery-item').count();
    expect(count).toBe(3);

    const loadMore = page.locator('#load-more-btn');
    await expect(loadMore).not.toBeAttached();
  });
});
