/**
 * Tests for public-facing (unauthenticated) ticket status pages.
 */
import { test, expect } from '@playwright/test';

test.describe('Public magic link / status page', () => {
  test('invalid token shows an error or "not found" state', async ({ page }) => {
    await page.goto('/status/invalid-smoke-token-xyz');
    // Should render the page shell (no full crash) and indicate the token is invalid
    await expect(
      page.getByText(/not found|invalid|error|request failed/i).first(),
    ).toBeVisible({ timeout: 10_000 });
  });

  test('status page does not require authentication cookie', async ({ page }) => {
    // Just hitting /status/xxx without a session should not redirect to /login
    const url = page.url();
    await page.goto('/status/smoke-anon-check');
    // Should stay on /status/... (not redirect to login)
    await expect(page).not.toHaveURL(/login/, { timeout: 5_000 });
  });

  test('requester portal page loads', async ({ page }) => {
    await page.goto('/requester');
    // The requester portal is a public page
    await expect(page.locator('body')).toBeVisible();
    await expect(page.getByText(/internal server error/i)).not.toBeVisible();
  });
});
