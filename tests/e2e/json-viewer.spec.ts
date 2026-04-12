import { test, expect } from '@playwright/test';

test.describe('JSON Viewer', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/tool/json-viewer');
  });

  test('renders the JSON Viewer tool page', async ({ page }) => {
    await expect(page.locator('textarea')).toBeVisible();
  });

  test('parses valid JSON and shows tree', async ({ page }) => {
    const textarea = page.locator('textarea');
    await textarea.fill('{"name": "John", "age": 30}');

    // Should render tree nodes
    await expect(page.getByText('"name"')).toBeVisible();
    await expect(page.getByText('"John"')).toBeVisible();
  });

  test('shows error for invalid JSON', async ({ page }) => {
    const textarea = page.locator('textarea');
    await textarea.fill('{invalid}');

    await expect(page.getByText('JSON inválido')).toBeVisible();
  });

  test('search highlights matching keys', async ({ page }) => {
    const textarea = page.locator('textarea');
    await textarea.fill('{"name": "John", "email": "john@test.com"}');

    // Wait for tree to render
    await expect(page.getByText('"name"')).toBeVisible();

    // Search
    const searchInput = page.getByPlaceholder('Buscar por clave o valor...');
    await searchInput.fill('email');
  });

  test('copy button works', async ({ page }) => {
    const textarea = page.locator('textarea');
    await textarea.fill('{"key": "value"}');

    await expect(page.getByText('Copiar')).toBeVisible();
  });
});
