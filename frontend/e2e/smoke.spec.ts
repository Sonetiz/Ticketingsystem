import { test, expect } from '@playwright/test';

test('homepage loads', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'ITSM Ticketing System' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Support Portal' })).toBeVisible();
});

test('portal login page loads', async ({ page }) => {
  await page.goto('/portal/login');
  await expect(page.getByRole('heading', { name: 'Support Portal Login' })).toBeVisible();
});

test('management login page loads', async ({ page }) => {
  await page.goto('/manage/login');
  await expect(page.getByRole('heading', { name: 'Management Portal' })).toBeVisible();
});
