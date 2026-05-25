import { test, expect } from '@playwright/test';
import { AGENT_STATE } from './fixtures/storage';
import { agentApi } from './fixtures/api';
import { uid } from './fixtures/data';

test.use({ storageState: AGENT_STATE });

let createdTicketId: string | undefined;

test.describe('Tickets', () => {
  test.beforeAll(async () => {
    await agentApi.login();
  });

  test.afterAll(async () => {
    if (createdTicketId) {
      await agentApi.delete(`/tickets/${createdTicketId}`).catch(() => {});
    }
  });

  test('dashboard shows ticket stats', async ({ page }) => {
    await page.goto('/portal');
    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
    await expect(page.getByText('Open Tickets')).toBeVisible();
    await expect(page.getByText('Unassigned')).toBeVisible();
  });

  test('ticket list loads', async ({ page }) => {
    await page.goto('/portal/tickets?view=active');
    await expect(page.getByRole('heading', { name: /tickets/i })).toBeVisible();
  });

  test('unassigned tickets page loads', async ({ page }) => {
    await page.goto('/portal/unassigned-tickets');
    await expect(page.getByRole('heading', { name: 'Unassigned Tickets' })).toBeVisible();
  });

  test('create new ticket form renders required fields', async ({ page }) => {
    await page.goto('/portal/tickets/new');
    await expect(page.getByRole('heading', { name: 'Create Ticket' })).toBeVisible();
    await expect(page.locator('input[placeholder*="itle"], input[name="title"]').or(page.getByLabel('Title'))).toBeVisible();
  });

  test('creates a ticket and navigates to detail', async ({ page }) => {
    const title = uid('ticket');
    await page.goto('/portal/tickets/new');

    // Fill title (the first text input on the form)
    await page.locator('form input[type="text"]').first().fill(title);

    await page.locator('form button[type="submit"]').click();

    // Should navigate to detail page
    await page.waitForURL(/\/portal\/tickets\/[^/]+$/, { timeout: 15_000 });

    const url = page.url();
    createdTicketId = url.split('/').pop();

    await expect(page.getByText(title)).toBeVisible();
  });

  test('ticket detail shows title and status badge', async ({ page }) => {
    if (!createdTicketId) test.skip();
    await page.goto(`/portal/tickets/${createdTicketId}`);
    await expect(page.locator('h1')).toBeVisible();
    // Status badge (new / open / etc)
    await expect(page.locator('span').filter({ hasText: /open|new|pending/i }).first()).toBeVisible();
  });

  test('assign-to-me button works without CSRF error', async ({ page }) => {
    if (!createdTicketId) test.skip();
    await page.goto(`/portal/tickets/${createdTicketId}`);

    // Wait for MetaPanel to load
    await expect(page.getByText('Details')).toBeVisible();

    const assignBtn = page.getByRole('button', { name: /assign to me/i });
    if (await assignBtn.isVisible()) {
      // Capture any network errors or toast errors
      const toastError = page.locator('[data-sonner-toast][data-type="error"]');

      await assignBtn.click();
      // Give time for the request to complete
      await page.waitForTimeout(2_000);

      // Must NOT show a CSRF / error toast
      await expect(toastError).not.toBeVisible();
    }
  });

  test('adding a comment works', async ({ page }) => {
    if (!createdTicketId) test.skip();
    await page.goto(`/portal/tickets/${createdTicketId}`);

    const commentText = `Smoke comment ${Date.now()}`;
    const textarea = page.locator('textarea').first();
    await textarea.fill(commentText);

    const submitBtn = page.getByRole('button', { name: /send|submit|add reply|post/i });
    await submitBtn.click();

    await expect(page.getByText(commentText)).toBeVisible({ timeout: 10_000 });
  });

  test('ticket filter by view=mine renders without error', async ({ page }) => {
    await page.goto('/portal/tickets?view=mine');
    // Should not show a full-page error
    await expect(page.locator('text=/error|failed|cannot/i')).not.toBeVisible({ timeout: 5_000 });
  });

  test('ticket filter by view=overdue renders', async ({ page }) => {
    await page.goto('/portal/tickets?view=overdue');
    await expect(page.locator('text=/error|failed|cannot/i')).not.toBeVisible({ timeout: 5_000 });
  });
});
