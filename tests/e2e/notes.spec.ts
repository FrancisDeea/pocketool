import { test, expect } from '@playwright/test';

test.describe('Quick Notes', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/tool/notes');
  });

  test('renders the Notes tool page', async ({ page }) => {
    await expect(page.getByText('Nueva')).toBeVisible();
  });

  test('creates a new note', async ({ page }) => {
    await page.getByText('Nueva').click();

    // Should show the editor with title input
    const titleInput = page.getByPlaceholder('Título de la nota...');
    await expect(titleInput).toBeVisible();

    // Type a title
    await titleInput.fill('Mi primera nota');
  });

  test('shows empty state when no notes', async ({ page }) => {
    // On a fresh page, the empty state should show
    await expect(
      page.getByText(/No hay notas aún|Selecciona o crea una nota/),
    ).toBeVisible();
  });
});
