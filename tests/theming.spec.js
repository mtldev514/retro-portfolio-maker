// @ts-check
const { test, expect } = require('@playwright/test');

test.describe('Theming system', () => {
  test.beforeEach(async ({ page }) => {
    // Clear localStorage to start fresh
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.removeItem('selectedTheme');
      localStorage.removeItem('themeCSS');
      localStorage.removeItem('themeColors'); // legacy cleanup
    });
    await page.reload();
    await page.waitForSelector('.gallery-item', { timeout: 10000 });
  });

  test('styles.json loads and themes are available internally', async ({ page }) => {
    // Wait for theme definitions to load
    await page.waitForTimeout(1000);

    // Theme switcher is hidden (allowUserSwitch: false) but definitions still loaded
    const themeCount = await page.evaluate(() => {
      return window.themes?._loaded ? window.themes.definitionsArray.length : 0;
    });

    // Should have at least 2 themes loaded internally (we ship 4 by default)
    expect(themeCount).toBeGreaterThanOrEqual(2);
  });

  test('switching theme changes CSS variables on :root', async ({ page }) => {
    await page.waitForTimeout(1000);

    // Get initial page background
    const initialBg = await page.evaluate(() => {
      return getComputedStyle(document.documentElement).getPropertyValue('--page-bg').trim();
    });

    // Switch to a different theme (changeTheme is async)
    await page.evaluate(async () => {
      if (window.themes && themes._loaded) {
        await themes.changeTheme('bubblegum');
      }
    });
    await page.waitForTimeout(300);

    // Get new page background
    const newBg = await page.evaluate(() => {
      return getComputedStyle(document.documentElement).getPropertyValue('--page-bg').trim();
    });

    // Should be different (bubblegum has pink tones)
    expect(newBg).not.toBe(initialBg);
  });

  test('theme persists across page reload', async ({ page }) => {
    await page.waitForTimeout(1000);

    // Switch to bubblegum theme
    await page.evaluate(async () => {
      if (window.themes && themes._loaded) {
        await themes.changeTheme('bubblegum');
      }
    });
    await page.waitForTimeout(300);

    // Verify localStorage was set
    const storedTheme = await page.evaluate(() => localStorage.getItem('selectedTheme'));
    expect(storedTheme).toBe('bubblegum');

    // Verify CSS was cached (new system caches full CSS text)
    const cachedCSS = await page.evaluate(() => localStorage.getItem('themeCSS'));
    expect(cachedCSS).toBeTruthy();

    // Reload and check theme is still applied
    await page.reload();
    await page.waitForSelector('.gallery-item', { timeout: 10000 });

    const themeAfterReload = await page.evaluate(() => localStorage.getItem('selectedTheme'));
    expect(themeAfterReload).toBe('bubblegum');
  });

  test('styles.json is accessible at styles/styles.json', async ({ page }) => {
    const response = await page.goto('/styles/styles.json');
    expect(response.status()).toBe(200);

    const data = await response.json();
    expect(data).toHaveProperty('themes');
    expect(data).toHaveProperty('defaultTheme');
    // themes is now an array
    expect(Array.isArray(data.themes)).toBe(true);
    expect(data.themes.length).toBeGreaterThanOrEqual(2);
  });

  test('theme CSS files are accessible', async ({ page }) => {
    // Fetch styles.json to get theme file list
    const response = await page.goto('/styles/styles.json');
    const data = await response.json();

    // Each theme's CSS file should be loadable
    for (const theme of data.themes) {
      const cssResponse = await page.goto(`/styles/${theme.file}`);
      expect(cssResponse.status()).toBe(200);
      const cssText = await cssResponse.text();
      // Each theme CSS should contain :root with CSS variables
      expect(cssText).toContain(':root');
      expect(cssText).toContain('--page-bg');
    }
  });
});
