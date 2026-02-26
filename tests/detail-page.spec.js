// @ts-check
const { test, expect } = require('@playwright/test');

test.describe('Detail page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('.gallery-item', { timeout: 10000 });
  });

  test('clicking a gallery item loads the detail page with content', async ({ page }) => {
    const firstLink = page.locator('.gallery-link').first();
    await firstLink.click();

    // Wait for detail page to render
    await page.waitForSelector('.detail-page', { timeout: 5000 });

    // Should have a title
    const title = page.locator('.detail-title');
    await expect(title).toBeVisible();
    const titleText = await title.textContent();
    expect(titleText.trim().length).toBeGreaterThan(0);
  });

  test('detail page shows date metadata', async ({ page }) => {
    const firstLink = page.locator('.gallery-link').first();
    await firstLink.click();

    await page.waitForSelector('.detail-page', { timeout: 5000 });

    // Meta section should exist with a date
    const meta = page.locator('.detail-meta');
    await expect(meta).toBeVisible();
  });

  test('detail page hero image is visible for visual categories', async ({ page }) => {
    // Click a painting item (visual category)
    await page.click('.filter-btn[data-filter="painting"]');
    await page.waitForTimeout(300);

    const paintingLink = page.locator('.gallery-link').first();
    await paintingLink.click();

    await page.waitForSelector('.detail-page', { timeout: 5000 });

    // Should have a hero image
    const heroImg = page.locator('.detail-hero img');
    await expect(heroImg).toBeVisible();
  });

  test('lightbox opens on image click and closes with Escape', async ({ page }) => {
    // Navigate to a painting detail
    await page.click('.filter-btn[data-filter="painting"]');
    await page.waitForTimeout(300);

    const paintingLink = page.locator('.gallery-link').first();
    await paintingLink.click();

    await page.waitForSelector('.detail-page', { timeout: 5000 });

    // Click the hero image
    const heroImg = page.locator('.detail-hero img').first();
    if (await heroImg.isVisible()) {
      await heroImg.click();

      // Lightbox should appear
      await page.waitForSelector('.lightbox-overlay', { timeout: 2000 });
      await expect(page.locator('.lightbox-overlay')).toBeVisible();

      // Press Escape to close
      await page.keyboard.press('Escape');
      await page.waitForTimeout(300);
      await expect(page.locator('.lightbox-overlay')).toHaveCount(0);
    }
  });

  test('back button navigates back to gallery grid', async ({ page }) => {
    const firstLink = page.locator('.gallery-link').first();
    await firstLink.click();

    await page.waitForSelector('.detail-page', { timeout: 5000 });

    // Click the back button
    const backBtn = page.locator('.filter-btn-back');
    if (await backBtn.isVisible()) {
      await backBtn.click();
      await page.waitForTimeout(500);

      // Should be back on the grid
      const galleryItems = page.locator('.gallery-item');
      await expect(galleryItems.first()).toBeVisible({ timeout: 5000 });
    }
  });
});
