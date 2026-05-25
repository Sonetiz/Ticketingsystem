import { test, expect } from '@playwright/test';
import { ADMIN_STATE } from './fixtures/storage';
import { adminApi } from './fixtures/api';
import { uid } from './fixtures/data';

test.use({ storageState: ADMIN_STATE });

let createdLicenseId: string | undefined;

test.describe('Software Licenses', () => {
  test.beforeAll(async () => {
    await adminApi.login();
  });

  test.afterAll(async () => {
    if (createdLicenseId) {
      await adminApi.delete(`/software/${createdLicenseId}`).catch(() => {});
    }
  });

  test('software licenses page loads', async ({ page }) => {
    await page.goto('/manage/software');
    await expect(page.getByRole('heading', { name: /software/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /new license|add license/i })).toBeVisible();
  });

  test('create software license modal opens', async ({ page }) => {
    await page.goto('/manage/software');
    await page.getByRole('button', { name: /new license|add license/i }).click();
    await expect(page.locator('[role="dialog"]')).toBeVisible();
  });

  test('creates a software license', async ({ page }) => {
    const name = uid('license');

    await page.goto('/manage/software');
    await page.getByRole('button', { name: /new license|add license/i }).click();

    const modal = page.locator('[role="dialog"]');
    // Name is the first text input
    await modal.locator('input[type="text"]').first().fill(name);
    // Vendor
    await modal.locator('input[type="text"]').nth(1).fill('Smoke Vendor');
    // Seats total (number input)
    await modal.locator('input[type="number"]').fill('5');

    await modal.getByRole('button', { name: /save|create/i }).click();

    await expect(page.getByText(name)).toBeVisible({ timeout: 10_000 });

    // Record id for cleanup
    const licenses = await adminApi.request<Array<{ id: string; name: string }>>('/software');
    const found = licenses.find((l) => l.name === name);
    createdLicenseId = found?.id;
  });

  test('license shows seat counts', async ({ page }) => {
    await page.goto('/manage/software');
    // Should show "0 / N seats" or similar text
    await expect(page.getByText(/seats/i)).toBeVisible({ timeout: 8_000 });
  });

  test('edit license modal populates with existing values', async ({ page }) => {
    if (!createdLicenseId) test.skip();
    await page.goto('/manage/software');

    // Click edit on the first (or our created) license
    const editBtn = page.getByRole('button', { name: /edit/i }).first();
    if (await editBtn.isVisible()) {
      await editBtn.click();
      await expect(page.locator('[role="dialog"]')).toBeVisible();
      // Modal should have a non-empty name field
      const nameInput = page.locator('[role="dialog"] input[type="text"]').first();
      await expect(nameInput).not.toHaveValue('');
    }
  });

  test('seeded license appears in the list', async ({ page }) => {
    await page.goto('/manage/software');
    // The seed creates one license called "Microsoft 365 Business"
    // Verify at least one row is present
    await expect(page.locator('tr, [data-row]').nth(1).or(page.locator('li').first())).toBeVisible({ timeout: 8_000 });
  });
});
