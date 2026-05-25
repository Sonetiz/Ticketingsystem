/**
 * Playwright setup project – runs once before all specs.
 * Logs in as each role and persists the storage state (cookies) to disk so
 * individual specs can reuse the authenticated sessions without re-logging in.
 */
import { test as setup } from '@playwright/test';
import { ADMIN_STATE, AGENT_STATE, REQUESTER_STATE } from './storage';

const users = [
  { email: 'admin@ticketsystem.local', password: 'password123', file: ADMIN_STATE, name: 'admin' },
  { email: 'agent@ticketsystem.local', password: 'password123', file: AGENT_STATE, name: 'agent' },
  { email: 'user@example.com', password: 'password123', file: REQUESTER_STATE, name: 'requester' },
];

for (const user of users) {
  setup(`authenticate as ${user.name}`, async ({ page }) => {
    const loginPath = user.name === 'admin' ? '/manage/login' : '/portal/login';
    await page.goto(loginPath);

    await page.locator('input[type="email"]').fill(user.email);
    await page.locator('input[type="password"]').fill(user.password);
    await page.locator('button[type="submit"]').click();

    await page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 15_000 });

    await page.context().storageState({ path: user.file });
  });
}
