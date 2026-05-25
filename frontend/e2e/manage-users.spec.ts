import { test, expect } from '@playwright/test';
import { ADMIN_STATE } from './fixtures/storage';
import { adminApi } from './fixtures/api';
import { uid } from './fixtures/data';

test.use({ storageState: ADMIN_STATE });

let createdUserId: string | undefined;

test.describe('Manage Users & Employees', () => {
  test.beforeAll(async () => {
    await adminApi.login();
  });

  test.afterAll(async () => {
    if (createdUserId) {
      await adminApi.delete(`/manage/users/${createdUserId}`).catch(() => {});
    }
  });

  test('users page loads with heading', async ({ page }) => {
    await page.goto('/manage/users');
    await expect(page.getByRole('heading', { name: /users & employees/i })).toBeVisible();
  });

  test('shows seeded admin user in the list', async ({ page }) => {
    await page.goto('/manage/users');
    await expect(page.getByText('admin@ticketsystem.local')).toBeVisible({ timeout: 10_000 });
  });

  test('filter input filters users', async ({ page }) => {
    await page.goto('/manage/users');
    // Type in the filter box
    await page.locator('input[placeholder*="filter"]').fill('admin');
    // Table should still show admin row
    await expect(page.getByText('admin@ticketsystem.local')).toBeVisible({ timeout: 5_000 });
  });

  test('non-login employees toggle exists', async ({ page }) => {
    await page.goto('/manage/users');
    await expect(page.getByText(/non-login employees/i)).toBeVisible();
  });

  test('add user modal opens', async ({ page }) => {
    await page.goto('/manage/users');
    await page.getByRole('button', { name: /add user/i }).click();
    await expect(page.locator('[role="dialog"]')).toBeVisible();
  });

  test('creates a non-login employee', async ({ page }) => {
    const name = uid('employee');
    const email = `${name}@smoke.test`.toLowerCase();

    await page.goto('/manage/users');
    await page.getByRole('button', { name: /add user/i }).click();

    const modal = page.locator('[role="dialog"]');
    // Name field
    await modal.locator('input[type="text"]').first().fill(name);
    // Email field
    await modal.locator('input[type="email"]').fill(email);
    // Job title
    await modal.locator('input').nth(2).fill('Smoke Tester');
    // Department
    await modal.locator('input').nth(3).fill('QA');

    // Enable "disable password login" checkbox to make it non-login
    const disableLoginCheckbox = modal.locator('input[type="checkbox"]').filter({ hasText: /disable/i }).first();
    if (await disableLoginCheckbox.count() === 0) {
      // The checkbox label is a sibling; use the label text approach
      const label = modal.getByText(/disable password login/i);
      if (await label.isVisible()) await label.click();
    } else {
      await disableLoginCheckbox.check();
    }

    await modal.getByRole('button', { name: /save/i }).click();

    await expect(page.getByText(name)).toBeVisible({ timeout: 10_000 });

    // Record id for cleanup
    const users = await adminApi.request<Array<{ id: string; name: string }>>('/manage/users');
    const found = users.find((u) => u.name === name);
    createdUserId = found?.id;
  });

  test('edit user modal populates values', async ({ page }) => {
    await page.goto('/manage/users');
    const editBtn = page.getByRole('button', { name: /edit/i }).first();
    await editBtn.click();
    await expect(page.locator('[role="dialog"]')).toBeVisible();
    // Name input should be pre-filled
    const nameInput = page.locator('[role="dialog"] input[type="text"]').first();
    await expect(nameInput).not.toHaveValue('');
  });
});
