/**
 * Smoke loads for every management page.
 * Each test navigates to a page and asserts the heading is visible,
 * and that no full-page JavaScript error appears.
 */
import { test, expect } from '@playwright/test';
import { ADMIN_STATE } from './fixtures/storage';

test.use({ storageState: ADMIN_STATE });

const mgmtPages: Array<{ path: string; heading: RegExp }> = [
  { path: '/manage', heading: /management|overview|settings/i },
  { path: '/manage/roles', heading: /roles/i },
  { path: '/manage/teams', heading: /teams/i },
  { path: '/manage/statuses', heading: /status/i },
  { path: '/manage/sla', heading: /sla/i },
  { path: '/manage/templates', heading: /templates/i },
  { path: '/manage/settings', heading: /settings/i },
  { path: '/manage/integrations', heading: /integrations/i },
  { path: '/manage/api-tokens', heading: /api tokens?/i },
  { path: '/manage/audit', heading: /audit/i },
];

for (const { path, heading } of mgmtPages) {
  test(`${path} loads without error`, async ({ page }) => {
    await page.goto(path);
    await expect(page.getByRole('heading').filter({ hasText: heading })).toBeVisible({ timeout: 10_000 });
    // Confirm no "Internal Server Error" or white screen
    await expect(page.getByText(/internal server error|unhandled exception/i)).not.toBeVisible();
  });
}
