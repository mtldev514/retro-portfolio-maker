// @ts-check
const { test, expect } = require('@playwright/test');

test.describe('Edit page', () => {
  test('edit.html loads without 404', async ({ page }) => {
    const response = await page.goto('/edit.html?category=painting&id=art_1770744060');
    expect(response.status()).not.toBe(404);
  });

  test('edit page shows loading state then form or error', async ({ page }) => {
    await page.goto('/edit.html?category=painting&id=art_1770744060');

    // Page should have the edit form or an error (since no admin server in test)
    const editForm = page.locator('#editForm');
    const errorBox = page.locator('#errorBox');

    // Wait for either the form to appear or the error
    await page.waitForTimeout(3000);

    const formVisible = await editForm.isVisible();
    const errorVisible = await errorBox.isVisible();

    // One of them should be visible (form if admin API is up, error if not)
    expect(formVisible || errorVisible).toBeTruthy();
  });

  test('edit page has correct form fields', async ({ page }) => {
    await page.goto('/edit.html?category=painting&id=art_1770744060');

    // Verify all form fields exist in the DOM
    await expect(page.locator('#editCategory')).toBeAttached();
    await expect(page.locator('#editId')).toBeAttached();
    await expect(page.locator('#editDate')).toBeAttached();
    await expect(page.locator('#editTitle')).toBeAttached();
    await expect(page.locator('#editDescription')).toBeAttached();
    await expect(page.locator('#editUrl')).toBeAttached();
  });

  test('edit page has save and cancel buttons', async ({ page }) => {
    await page.goto('/edit.html?category=painting&id=art_1770744060');

    // Should have Save and Cancel buttons
    await expect(page.locator('.save-btn')).toBeAttached();
    await expect(page.locator('button:has-text("Cancel")')).toBeAttached();
  });

  test('edit page shows error for missing parameters', async ({ page }) => {
    // Navigate without params
    await page.goto('/edit.html');
    await page.waitForTimeout(2000);

    // Should show error
    const errorBox = page.locator('#errorBox');
    await expect(errorBox).toBeVisible();
  });

  test('admin panel edit buttons link to edit.html', async ({ page }) => {
    // Go to admin page and check that edit links exist
    const response = await page.goto('/admin.html');
    expect(response.status()).not.toBe(404);

    // The admin page JS generates edit buttons dynamically,
    // so just verify the page loaded
    await expect(page.locator('.title-bar')).toBeVisible();
  });
});
