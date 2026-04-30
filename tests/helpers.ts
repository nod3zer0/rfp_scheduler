/**
 * Shared helpers for E2E tests.
 * Uses the running preview server's API to seed test data.
 */
import type { Page } from '@playwright/test';

const BASE = 'http://localhost:4173';

export async function createGroup(page: Page, groupName: string, adminPassword: string) {
	// Register a user first (required to create groups)
	const uniqueSuffix = Date.now().toString(36);
	const userName = `TestOwner_${uniqueSuffix}`;

	await page.goto('/account/register');
	await page.fill('input[name=name]', userName);
	await page.fill('input[name=password]', 'password123');
	await page.fill('input[name=confirm]', 'password123');
	await page.getByRole('button', { name: /create account/i }).click();
	await page.waitForURL('**/account/groups');

	// Create a group
	await page.goto('/groups/new');
	await page.fill('input[name=name]', groupName);
	await page.fill('input[name=password]', adminPassword);
	await page.fill('input[name=confirm]', adminPassword);
	await page.getByRole('button', { name: /create group/i }).click();
	// Redirected to manage page
	await page.waitForURL(/\/groups\/.+\/manage/);

	const url = page.url();
	const groupId = url.match(/\/groups\/([^/]+)\/manage/)?.[1] ?? '';

	return { groupId, userName };
}

export async function createInviteLink(page: Page, groupId: string, adminPassword: string) {
	const res = await page.request.post(`${BASE}/api/invite-links`, {
		data: { groupId, adminPassword }
	});
	const data = await res.json();
	return data.id as string;
}

export async function logout(page: Page) {
	// Logout requires POST - use the API directly
	await page.request.post(`${BASE}/account/logout`);
	// Clear cookies to ensure clean state
	await page.context().clearCookies();
}
