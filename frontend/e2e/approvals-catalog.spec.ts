import { test, expect } from '@playwright/test';
import { AGENT_STATE } from './fixtures/storage';

test.use({ storageState: AGENT_STATE });

test.describe('Approvals', () => {
  test('approvals page loads with heading', async ({ page }) => {
    await page.goto('/portal/approvals');
    await expect(page.getByRole('heading', { name: 'Approvals' })).toBeVisible();
  });

  test('approvals page shows list or empty state without error', async ({ page }) => {
    await page.goto('/portal/approvals');
    await expect(
      page.getByText(/approval requests are not available yet/i).or(page.locator('[class*="divide-y"]')),
    ).toBeVisible({ timeout: 10_000 });
  });
});

test.describe('Service Catalog', () => {
  test('catalog page loads with heading', async ({ page }) => {
    await page.goto('/portal/catalog');
    await expect(page.getByRole('heading', { name: 'Service Catalog' })).toBeVisible();
  });

  test('catalog page shows items or empty state without error', async ({ page }) => {
    await page.goto('/portal/catalog');
    await expect(
      page.getByText(/service catalog is not available yet/i).or(page.locator('article')).first(),
    ).toBeVisible({ timeout: 10_000 });
  });
});
