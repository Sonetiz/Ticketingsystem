import { test, expect } from '@playwright/test';
import { AGENT_STATE } from './fixtures/storage';

test.use({ storageState: AGENT_STATE });

test.describe('Reports', () => {
  test('reports page loads with heading', async ({ page }) => {
    await page.goto('/portal/reports');
    await expect(page.getByRole('heading', { name: /reports/i })).toBeVisible();
  });

  test('period stats section renders', async ({ page }) => {
    await page.goto('/portal/reports');
    // Period stats section has Created / Resolved labels
    await expect(page.getByText(/created|resolved/i).first()).toBeVisible({ timeout: 10_000 });
  });

  test('date range inputs are present', async ({ page }) => {
    await page.goto('/portal/reports');
    const dateInputs = page.locator('input[type="date"]');
    await expect(dateInputs.first()).toBeVisible({ timeout: 8_000 });
  });

  test('export CSV button is present', async ({ page }) => {
    await page.goto('/portal/reports');
    await expect(page.getByRole('button', { name: /export/i })).toBeVisible({ timeout: 8_000 });
  });

  test('no unhandled error shown on reports page', async ({ page }) => {
    await page.goto('/portal/reports');
    await page.waitForTimeout(2_000);
    await expect(page.getByText(/error|failed|cannot/i)).not.toBeVisible();
  });
});
