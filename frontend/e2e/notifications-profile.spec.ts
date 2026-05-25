import { test, expect } from '@playwright/test';
import { AGENT_STATE } from './fixtures/storage';

test.use({ storageState: AGENT_STATE });

test.describe('Notifications', () => {
  test('notifications page loads with heading', async ({ page }) => {
    await page.goto('/portal/notifications');
    await expect(page.getByRole('heading', { name: 'Notifications' })).toBeVisible();
  });

  test('mark all as read button is present', async ({ page }) => {
    await page.goto('/portal/notifications');
    await expect(page.getByRole('button', { name: /mark all/i })).toBeVisible({ timeout: 8_000 });
  });
});

test.describe('Profile', () => {
  test('profile page loads with heading', async ({ page }) => {
    await page.goto('/portal/profile');
    await expect(page.getByRole('heading', { name: /profile|account/i })).toBeVisible({ timeout: 8_000 });
  });

  test('profile page shows email field or user info', async ({ page }) => {
    await page.goto('/portal/profile');
    // Should show the logged-in user's email
    await expect(page.getByText(/agent@ticketsystem\.local/i)).toBeVisible({ timeout: 8_000 });
  });
});
