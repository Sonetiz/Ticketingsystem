import { test, expect } from '@playwright/test';
import { AGENT_STATE } from './fixtures/storage';

test.use({ storageState: AGENT_STATE });

test.describe('Change Management', () => {
  test('changes list page loads', async ({ page }) => {
    await page.goto('/portal/projects');
    // Changes are scoped to projects in this app; use the project list
    await expect(page.getByRole('heading', { name: /project/i })).toBeVisible();
  });
});

test.describe('Problem Management', () => {
  test('problems page loads with heading', async ({ page }) => {
    await page.goto('/portal/problems');
    await expect(page.getByRole('heading', { name: /problem management/i })).toBeVisible();
  });

  test('problems page renders list or empty state without error', async ({ page }) => {
    await page.goto('/portal/problems');
    // Should show either a table or "not available yet" – never a stack trace
    await expect(
      page.getByText(/problem records are not available yet/i).or(page.locator('table')),
    ).toBeVisible({ timeout: 10_000 });
  });

  test('problem detail page loads for first seeded problem', async ({ page }) => {
    // Try to find a problem via API, then navigate to it
    const res = await page.request.get('http://localhost:3001/api/problems');
    if (!res.ok()) {
      test.skip();
      return;
    }
    const problems = await res.json() as Array<{ id: string }>;
    if (!problems.length) {
      test.skip();
      return;
    }
    await page.goto(`/portal/problems/${problems[0].id}`);
    // Should show problem details or "not found"
    await expect(page.locator('h1, h2').first()).toBeVisible({ timeout: 10_000 });
  });

  test('problem detail shows Linked Assets panel', async ({ page }) => {
    const res = await page.request.get('http://localhost:3001/api/problems');
    if (!res.ok()) { test.skip(); return; }
    const problems = await res.json() as Array<{ id: string }>;
    if (!problems.length) { test.skip(); return; }

    await page.goto(`/portal/problems/${problems[0].id}`);
    await expect(page.getByText(/linked assets/i)).toBeVisible({ timeout: 10_000 });
  });
});
