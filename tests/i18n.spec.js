// @ts-check
const { test, expect } = require('@playwright/test');

test.describe('Internationalization', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('.gallery-item', { timeout: 10000 });
  });

  test('default language is English', async ({ page }) => {
    const title = await page.locator('#page-title').textContent();
    expect(title?.trim()).toBe('Test Portfolio');
  });

  test('switching to French updates header text', async ({ page }) => {
    // Click the French language option
    await page.evaluate(() => {
      const labels = document.querySelectorAll('.settings-dropdown .settings-section-label');
      for (const label of labels) {
        if (label.textContent.trim() === 'Language') {
          let sibling = label.nextElementSibling;
          while (sibling && sibling.classList.contains('settings-option')) {
            if (sibling.textContent.includes('Français')) {
              sibling.click();
              return;
            }
            sibling = sibling.nextElementSibling;
          }
        }
      }
    });

    await page.waitForTimeout(500);

    const title = await page.locator('#page-title').textContent();
    expect(title?.trim()).toBe('Portfolio Test');
  });

  test('switching to Spanish updates header text', async ({ page }) => {
    await page.evaluate(() => {
      const labels = document.querySelectorAll('.settings-dropdown .settings-section-label');
      for (const label of labels) {
        if (label.textContent.trim() === 'Language') {
          let sibling = label.nextElementSibling;
          while (sibling && sibling.classList.contains('settings-option')) {
            if (sibling.textContent.includes('Español')) {
              sibling.click();
              return;
            }
            sibling = sibling.nextElementSibling;
          }
        }
      }
    });

    await page.waitForTimeout(500);

    const title = await page.locator('#page-title').textContent();
    expect(title?.trim()).toBe('Portafolio de Prueba');
  });

  test('switching to Creole updates header text', async ({ page }) => {
    await page.evaluate(() => {
      const labels = document.querySelectorAll('.settings-dropdown .settings-section-label');
      for (const label of labels) {
        if (label.textContent.trim() === 'Language') {
          let sibling = label.nextElementSibling;
          while (sibling && sibling.classList.contains('settings-option')) {
            if (sibling.textContent.includes('Kreyòl')) {
              sibling.click();
              return;
            }
            sibling = sibling.nextElementSibling;
          }
        }
      }
    });

    await page.waitForTimeout(500);

    const title = await page.locator('#page-title').textContent();
    expect(title?.trim()).toBe('Pòtfolyo Tès');
  });

  test('gallery item titles update on language switch', async ({ page }) => {
    // Get first painting title in English
    await page.click('.filter-btn[data-filter="painting"]');
    await page.waitForTimeout(300);

    // Switch to French
    await page.evaluate(() => {
      const labels = document.querySelectorAll('.settings-dropdown .settings-section-label');
      for (const label of labels) {
        if (label.textContent.trim() === 'Language') {
          let sibling = label.nextElementSibling;
          while (sibling && sibling.classList.contains('settings-option')) {
            if (sibling.textContent.includes('Français')) {
              sibling.click();
              return;
            }
            sibling = sibling.nextElementSibling;
          }
        }
      }
    });

    await page.waitForTimeout(500);

    // The gallery re-renders with translated titles — check for a French title
    const titles = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('.gallery-item h3'))
        .map(h3 => h3.textContent?.trim());
    });

    // At least one should be a French title from our test data
    const hasFrench = titles.some(t =>
      t?.includes('Coucher de soleil') ||
      t?.includes('Port bleu') ||
      t?.includes('Jardin abstrait') ||
      t?.includes('Lumières') ||
      t?.includes('Brouillard') ||
      t?.includes('Champs rouges')
    );
    expect(hasFrench).toBe(true);
  });
});
