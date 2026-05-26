import { test, expect } from '@playwright/test';
import { AGENT_STATE } from './fixtures/storage';
import { agentApi } from './fixtures/api';
import { uid } from './fixtures/data';

test.use({ storageState: AGENT_STATE });

let createdArticleId: string | undefined;

test.describe('Knowledge Base', () => {
  test.beforeAll(async () => {
    await agentApi.login();
  });

  test.afterAll(async () => {
    if (createdArticleId) {
      await agentApi.delete(`/knowledge-base/${createdArticleId}`).catch(() => {});
    }
  });

  test('KB page loads with heading', async ({ page }) => {
    await page.goto('/portal/knowledge-base');
    await expect(page.getByRole('heading', { name: 'Knowledge Base' })).toBeVisible();
    await expect(page.getByRole('button', { name: /new article/i })).toBeVisible();
  });

  test('create article modal opens', async ({ page }) => {
    await page.goto('/portal/knowledge-base');
    await page.getByRole('button', { name: /new article/i }).click();
    await expect(page.getByText(/create knowledge article/i)).toBeVisible();
  });

  test('creates a new KB article', async ({ page }) => {
    const title = uid('kb-article');
    const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-');

    await page.goto('/portal/knowledge-base');
    await page.getByRole('button', { name: /new article/i }).click();

    // Fill in the form inside the modal.
    // Textbox order in the modal: 0=Title, 1=Slug (auto-filled), 2=Category, 3=Content (textarea)
    const modal = page.locator('[role="dialog"]');
    await modal.getByRole('textbox').nth(0).fill(title);
    await modal.getByRole('textbox').nth(3).fill('Test content for smoke test article.');
    await modal.getByRole('button', { name: /create/i }).click();

    // Article should appear in list
    await expect(page.getByText(title)).toBeVisible({ timeout: 10_000 });

    // Get the article id from the API for cleanup
    const articles = await agentApi.request<Array<{ id: string; title: string }>>('/knowledge-base');
    const created = articles.find((a) => a.title === title);
    createdArticleId = created?.id;
  });

  test('article is visible in the list', async ({ page }) => {
    await page.goto('/portal/knowledge-base');
    // At least one article should be present (seeded or created above)
    await expect(page.locator('article').first()).toBeVisible({ timeout: 10_000 });
  });
});
