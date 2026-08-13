import { test, expect } from '@playwright/test';

test.describe('Navigation', () => {
  test('home page loads with tool cards', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByText('Herramientas esenciales')).toBeVisible();
    await expect(page.getByText('JSON Viewer')).toBeVisible();
    await expect(page.getByText('Markdown Editor')).toBeVisible();
    await expect(page.getByText('Image Optimizer')).toBeVisible();
    await expect(page.getByText('Quick Notes')).toBeVisible();
  });

  test('navigates to a tool from home page', async ({ page }) => {
    await page.goto('/');
    await page
      .getByRole('link', { name: /JSON Viewer/ })
      .first()
      .click();
    await expect(page).toHaveURL(/\/tool\/json-viewer/);
  });

  test('sidebar shows all tools', async ({ page }) => {
    await page.goto('/tool/json-viewer');

    // Sidebar should have tool entries
    await expect(page.locator('nav a')).toHaveCount(4);
  });

  test('English i18n pages work', async ({ page }) => {
    await page.goto('/en');
    await expect(page.getByText('Essential tools')).toBeVisible();
  });

  test('theme button is visible in topbar', async ({ page }) => {
    await page.goto('/');
    // The theme icon button should be present
    await expect(page.locator('header button').first()).toBeVisible();
  });
});
