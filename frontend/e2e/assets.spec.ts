import { test, expect } from '@playwright/test';
import { ADMIN_STATE } from './fixtures/storage';
import { adminApi } from './fixtures/api';
import { uid } from './fixtures/data';

// Assets require at least asset.create; admin has all permissions
test.use({ storageState: ADMIN_STATE });

let createdAssetId: string | undefined;

test.describe('Assets', () => {
  test.beforeAll(async () => {
    await adminApi.login();
  });

  test.afterAll(async () => {
    if (createdAssetId) {
      await adminApi.delete(`/assets/${createdAssetId}`).catch(() => {});
    }
  });

  test('asset list page loads', async ({ page }) => {
    await page.goto('/portal/assets');
    await expect(page.getByRole('heading', { name: /assets/i })).toBeVisible();
  });

  test('create asset modal opens', async ({ page }) => {
    await page.goto('/portal/assets');
    await page.getByRole('button', { name: /add asset|new asset|create asset/i }).click();
    await expect(page.locator('[role="dialog"]')).toBeVisible();
  });

  test('creates an asset with required fields', async ({ page }) => {
    const name = uid('asset');

    await page.goto('/portal/assets');
    await page.getByRole('button', { name: /add asset|new asset|create asset/i }).click();

    const modal = page.locator('[role="dialog"]');
    // Name field (first text input)
    await modal.locator('input[type="text"]').nth(0).fill(name);
    // Asset type (second text input)
    await modal.locator('input[type="text"]').nth(1).fill('Laptop');

    await modal.getByRole('button', { name: /create|save/i }).click();

    // Asset should appear in list
    await expect(page.getByText(name)).toBeVisible({ timeout: 10_000 });

    // Grab the id for later tests and cleanup
    const created = await adminApi.request<{ data: Array<{ id: string; name: string }> }>('/assets?limit=50');
    const list = Array.isArray(created) ? created : (created.data ?? []);
    const found = (list as Array<{ id: string; name: string }>).find((a) => a.name === name);
    createdAssetId = found?.id;
  });

  test('asset detail page loads', async ({ page }) => {
    if (!createdAssetId) test.skip();
    await page.goto(`/portal/assets/${createdAssetId}`);
    await expect(page.locator('h1, h2').first()).toBeVisible({ timeout: 10_000 });
  });

  test('asset detail shows Relationships section', async ({ page }) => {
    if (!createdAssetId) test.skip();
    await page.goto(`/portal/assets/${createdAssetId}`);
    await expect(page.getByRole('heading', { name: /relationships/i })).toBeVisible({ timeout: 10_000 });
  });

  test('asset detail shows Software Installations section', async ({ page }) => {
    if (!createdAssetId) test.skip();
    await page.goto(`/portal/assets/${createdAssetId}`);
    await expect(page.getByRole('heading', { name: /software/i })).toBeVisible({ timeout: 10_000 });
  });

  test('add relationship modal opens', async ({ page }) => {
    if (!createdAssetId) test.skip();
    await page.goto(`/portal/assets/${createdAssetId}`);
    const addRelBtn = page.getByRole('button', { name: /add relationship/i });
    await expect(addRelBtn).toBeVisible({ timeout: 10_000 });
    await addRelBtn.click();
    await expect(page.locator('[role="dialog"]')).toBeVisible();
  });

  test('install software modal opens', async ({ page }) => {
    if (!createdAssetId) test.skip();
    await page.goto(`/portal/assets/${createdAssetId}`);
    const installBtn = page.getByRole('button', { name: /install software/i });
    await expect(installBtn).toBeVisible({ timeout: 10_000 });
    await installBtn.click();
    await expect(page.locator('[role="dialog"]')).toBeVisible();
  });

  test('asset list filter renders', async ({ page }) => {
    await page.goto('/portal/assets?status=in_use');
    await expect(page.getByRole('heading', { name: /assets/i })).toBeVisible();
  });

  test('CSV import button is present', async ({ page }) => {
    await page.goto('/portal/assets');
    await expect(page.getByRole('button', { name: /import/i })).toBeVisible();
  });

  test('CSV import modal opens and shows dry-run option', async ({ page }) => {
    await page.goto('/portal/assets');
    await page.getByRole('button', { name: /import/i }).click();
    const modal = page.locator('[role="dialog"]');
    await expect(modal).toBeVisible();
    // The modal heading mentions CSV
    await expect(modal.getByRole('heading', { name: /csv/i })).toBeVisible();
    // Dry-run button is present
    await expect(modal.getByRole('button', { name: /dry run/i })).toBeVisible();
  });
});
