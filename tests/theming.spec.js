// @ts-check
const { test, expect } = require('@playwright/test');

test.describe('Theming system', () => {
  test.beforeEach(async ({ page }) => {
    // Clear localStorage to start fresh
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.removeItem('selectedTheme');
      localStorage.removeItem('themeColors');
    });
    await page.reload();
    await page.waitForSelector('.gallery-item', { timeout: 10000 });
  });

  test('themes.json loads and populates theme switcher', async ({ page }) => {
    // Wait for theme definitions to load
    await page.waitForTimeout(1000);

    // Check that theme options are in the settings dropdown
    const themeOptions = await page.evaluate(() => {
      const dropdown = document.querySelector('.settings-dropdown');
      if (!dropdown) return [];
      const labels = dropdown.querySelectorAll('.settings-section-label');
      let themeSection = null;
      labels.forEach(l => { if (l.textContent.trim() === 'Theme') themeSection = l; });
      if (!themeSection) return [];

      const options = [];
      let sibling = themeSection.nextElementSibling;
      while (sibling && !sibling.classList.contains('settings-divider') && !sibling.classList.contains('settings-section-label')) {
        if (sibling.classList.contains('settings-option')) {
          options.push(sibling.textContent.trim());
        }
        sibling = sibling.nextElementSibling;
      }
      return options;
    });

    // Should have at least 2 themes (we ship 4 by default)
    expect(themeOptions.length).toBeGreaterThanOrEqual(2);
  });

  test('switching theme changes CSS variables on :root', async ({ page }) => {
    await page.waitForTimeout(1000);

    // Get initial page background
    const initialBg = await page.evaluate(() => {
      return getComputedStyle(document.documentElement).getPropertyValue('--page-bg').trim();
    });

    // Switch to a different theme
    await page.evaluate(() => {
      if (window.themes && themes._loaded) {
        themes.changeTheme('bubblegum');
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
    await page.evaluate(() => {
      if (window.themes && themes._loaded) {
        themes.changeTheme('bubblegum');
      }
    });
    await page.waitForTimeout(300);

    // Verify localStorage was set
    const storedTheme = await page.evaluate(() => localStorage.getItem('selectedTheme'));
    expect(storedTheme).toBe('bubblegum');

    // Verify colors were cached
    const cachedColors = await page.evaluate(() => localStorage.getItem('themeColors'));
    expect(cachedColors).toBeTruthy();

    // Reload and check theme is still applied
    await page.reload();
    await page.waitForSelector('.gallery-item', { timeout: 10000 });

    const themeAfterReload = await page.evaluate(() => localStorage.getItem('selectedTheme'));
    expect(themeAfterReload).toBe('bubblegum');
  });

  test('themes.json is accessible at config/themes.json', async ({ page }) => {
    const response = await page.goto('/config/themes.json');
    expect(response.status()).toBe(200);

    const data = await response.json();
    expect(data).toHaveProperty('themes');
    expect(data).toHaveProperty('defaultTheme');
    expect(Object.keys(data.themes).length).toBeGreaterThanOrEqual(2);
  });
});
