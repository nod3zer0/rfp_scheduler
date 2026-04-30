import { test, expect } from '@playwright/test';
import { createGroup, createInviteLink } from './helpers.js';

test.describe('Join group via invite link', () => {
	test('guest joins group, enters name, and lands on schedule', async ({ page }) => {
		const adminPw = 'admin123';
		const { groupId } = await createGroup(page, 'Festival Friends', adminPw);
		const linkId = await createInviteLink(page, groupId, adminPw);

		// Log out by clearing all cookies
		await page.context().clearCookies();

		// Visit invite link as a fresh visitor
		await page.goto(`/join/${linkId}`);

		// Should see the group name in the heading (contains "Join")
		await expect(page.locator('h1')).toContainText('Join');

		// Enter a name and submit
		await page.fill('input[name=name]', 'GuestUser');
		await page.getByRole('button', { name: /join/i }).click();

		// Should land on the main schedule page
		await page.waitForURL('/');
		await expect(page).toHaveURL('/');
	});

	test('invite link shows warning when guests are disabled', async ({ page }) => {
		const adminPw = 'admin123';
		const { groupId } = await createGroup(page, 'Private Group', adminPw);
		const linkId = await createInviteLink(page, groupId, adminPw);

		// Disable guests via the manage page
		await page.goto(`/groups/${groupId}/manage`);
		// Login to manage page
		await page.fill('input[name=password]', adminPw);
		await page.getByRole('button', { name: /unlock|login|submit/i }).click();

		// Wait for the authenticated view (should show "Access" section)
		await page.waitForSelector('text=Access');

		// Toggle guests off (the toggle button has aria-label with "guest" or shows "Allow")
		const guestToggle = page.locator('button:has-text("Disable"), button:has-text("Allow")').first();
		if (await guestToggle.isVisible()) {
			await guestToggle.click();
			// Wait a moment for the toggle to take effect
			await page.waitForTimeout(500);
		}

		// Clear cookies to become an unauthenticated visitor
		await page.context().clearCookies();
		
		// Visit invite link
		await page.goto(`/join/${linkId}`);

		// Should see the join page with a warning about guests not being allowed
		await expect(page.locator('body')).toContainText(/requires.*account|registered|sign in/i);
	});
});
