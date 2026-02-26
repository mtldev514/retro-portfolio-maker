// @ts-check
const { test, expect } = require('@playwright/test');

/**
 * Regression: Bug #1 — Only 2 of 4 languages shown in selector
 * Regression: Bug #2 — Languages inserted in reverse order
 */
test.describe('Language selector', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('.gallery-item', { timeout: 10000 });
  });

  test('shows all 4 configured languages (Bug #1 regression)', async ({ page }) => {
    // Find language options: they are .settings-option elements after the "Language" label
    const langOptions = await page.evaluate(() => {
      const labels = document.querySelectorAll('.settings-dropdown .settings-section-label');
      let langLabel = null;
      for (const label of labels) {
        if (label.textContent.trim() === 'Language') {
          langLabel = label;
          break;
        }
      }
      if (!langLabel) return [];

      const options = [];
      let sibling = langLabel.nextElementSibling;
      while (sibling && sibling.classList.contains('settings-option')) {
        options.push(sibling.textContent.trim());
        sibling = sibling.nextElementSibling;
      }
      return options;
    });

    expect(langOptions).toHaveLength(4);
  });

  test('languages appear in correct config order (Bug #2 regression)', async ({ page }) => {
    const langTexts = await page.evaluate(() => {
      const labels = document.querySelectorAll('.settings-dropdown .settings-section-label');
      let langLabel = null;
      for (const label of labels) {
        if (label.textContent.trim() === 'Language') {
          langLabel = label;
          break;
        }
      }
      if (!langLabel) return [];

      const texts = [];
      let sibling = langLabel.nextElementSibling;
      while (sibling && sibling.classList.contains('settings-option')) {
        texts.push(sibling.textContent.trim());
        sibling = sibling.nextElementSibling;
      }
      return texts;
    });

    // Order must match languages.json: English, Français, Español, Kreyòl Ayisyen
    expect(langTexts[0]).toContain('English');
    expect(langTexts[1]).toContain('Français');
    expect(langTexts[2]).toContain('Español');
    expect(langTexts[3]).toContain('Kreyòl Ayisyen');
  });

  test('Language label exists in settings dropdown', async ({ page }) => {
    const hasLangLabel = await page.evaluate(() => {
      const labels = document.querySelectorAll('.settings-dropdown .settings-section-label');
      return Array.from(labels).some(l => l.textContent.trim() === 'Language');
    });

    expect(hasLangLabel).toBe(true);
  });
});
