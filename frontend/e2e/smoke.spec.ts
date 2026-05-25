/**
 * Legacy smoke spec – kept so existing CI references don't break.
 * The full smoke suite is now spread across domain-specific spec files.
 * This file covers only the top-level public pages.
 */
import { test, expect } from '@playwright/test';

test('homepage loads', async ({ page }) => {
  await page.goto('/');
  // The homepage redirects to /portal or renders a landing page
  await expect(page.locator('body')).toBeVisible();
});

test('portal login page loads', async ({ page }) => {
  await page.goto('/portal/login');
  await expect(page.getByRole('heading', { name: 'Support Portal Login' })).toBeVisible();
});

test('management login page loads', async ({ page }) => {
  await page.goto('/manage/login');
  await expect(page.getByRole('heading', { name: 'Management Portal' })).toBeVisible();
});
