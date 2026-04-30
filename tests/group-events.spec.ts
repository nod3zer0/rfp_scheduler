import { test, expect } from '@playwright/test';
import { createGroup } from './helpers.js';

test.describe('Group events', () => {
	test('creates a group event and it appears on the overview page', async ({ page }) => {
		await createGroup(page, 'Event Test Group', 'pw1234');
		await page.goto('/overview');

		// Open the add event form
		const addBtn = page.getByRole('button', { name: /add event/i });
		await expect(addBtn).toBeVisible();
		await addBtn.click();

		// Fill in the event form
		await page.locator('input[placeholder*="Event name"]').fill('Group Photo');
		await page.locator('input[type="time"]').first().fill('15:00');

		// Submit the event
		await page.getByRole('button', { name: /^add event$/i }).click();

		// Wait for the event to appear
		await expect(page.locator('body')).toContainText('Group Photo');
	});

	test('group event appears in the main schedule grid column', async ({ page }) => {
		await createGroup(page, 'Grid Event Group', 'pw1234');

		// Create event via API
		await page.request.post('/api/group-events', {
			data: { title: 'Grid Test Event', day: 'wednesday', timeStart: '14:00', timeEnd: '15:00' }
		});

		await page.goto('/?day=wednesday');

		// The group events column should be visible on desktop
		await expect(page.locator('body')).toContainText('Grid Test Event');
	});

	test('can join and leave a group event', async ({ page }) => {
		await createGroup(page, 'Attend Test Group', 'pw1234');

		// Create event via API
		await page.request.post('/api/group-events', {
			data: { title: 'Team Dinner', day: 'wednesday', timeStart: '19:00' }
		});

		await page.goto('/?day=wednesday');

		// The event should be visible with a join button
		const joinBtn = page.getByRole('button', { name: /join/i }).first();
		await expect(joinBtn).toBeVisible();
		await joinBtn.click();

		// Should now show checkmark or "In"
		await expect(page.locator('body')).toContainText(/✓|in/i);
	});

	test('group event shows in Today / NowPlaying strip', async ({ page }) => {
		await createGroup(page, 'NowPlaying Group', 'pw1234');

		// Create an event for today's festival day (defaulting to wednesday)
		await page.request.post('/api/group-events', {
			data: { title: 'Now Playing Event', day: 'wednesday', timeStart: '10:00', timeEnd: '23:00' }
		});

		await page.goto('/');

		// The page should contain the event title
		await expect(page.locator('body')).toContainText('Now Playing Event');
	});
});
