import { test, expect } from '@playwright/test';

test.describe('Markdown Editor', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/tool/markdown-editor');
  });

  test('renders the Markdown Editor tool page', async ({ page }) => {
    await expect(page.locator('textarea')).toBeVisible();
  });

  test('shows preview of markdown content', async ({ page }) => {
    // The editor pre-fills with sample content
    // Verify the preview renders HTML
    await expect(page.locator('h1')).toBeVisible();
  });

  test('download .md button is visible', async ({ page }) => {
    await expect(page.getByText('.md')).toBeVisible();
  });

  test('download .html button is visible', async ({ page }) => {
    await expect(page.getByText('.html')).toBeVisible();
  });
});
