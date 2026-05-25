/**
 * Storage state file paths for the three seeded roles.
 * Kept in a non-test file so spec files can import without triggering
 * Playwright's "test files should not import other test files" error.
 */
import path from 'path';

export const ADMIN_STATE = path.join(__dirname, '../.auth/admin.json');
export const AGENT_STATE = path.join(__dirname, '../.auth/agent.json');
export const REQUESTER_STATE = path.join(__dirname, '../.auth/requester.json');
