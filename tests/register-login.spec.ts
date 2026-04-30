import { test, expect } from '@playwright/test';

const UNIQUE = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 5);

test.describe('Registration and login', () => {
	test('registers a new user and redirects to group chooser', async ({ page }) => {
		const name = `User_${UNIQUE()}`;

		await page.goto('/account/register');
		await expect(page.getByRole('heading', { name: /create account/i })).toBeVisible();

		await page.fill('input[name=name]', name);
		await page.fill('input[name=password]', 'password123');
		await page.fill('input[name=confirm]', 'password123');
		await page.getByRole('button', { name: /create account/i }).click();

		// After registration with no group, goes to /account/groups
		await page.waitForURL('/account/groups');
		await expect(page).toHaveURL('/account/groups');
	});

	test('login with correct credentials and redirect to groups', async ({ page }) => {
		const name = `User_${UNIQUE()}`;

		// Register first
		await page.goto('/account/register');
		await page.fill('input[name=name]', name);
		await page.fill('input[name=password]', 'logintest');
		await page.fill('input[name=confirm]', 'logintest');
		await page.getByRole('button', { name: /create account/i }).click();
		await page.waitForURL('/account/groups');

		// Log out by clearing cookies and going to login page
		await page.context().clearCookies();
		await page.goto('/account/login');

		// Log in
		await page.fill('input[name=name]', name);
		await page.fill('input[name=password]', 'logintest');
		await page.getByRole('button', { name: /sign in/i }).click();

		await page.waitForURL('/account/groups');
		await expect(page).toHaveURL('/account/groups');
	});

	test('login with wrong password shows error', async ({ page }) => {
		const name = `User_${UNIQUE()}`;

		// Register
		await page.goto('/account/register');
		await page.fill('input[name=name]', name);
		await page.fill('input[name=password]', 'correctpw');
		await page.fill('input[name=confirm]', 'correctpw');
		await page.getByRole('button', { name: /create account/i }).click();
		await page.waitForURL('/account/groups');

		// Log out by clearing cookies
		await page.context().clearCookies();
		await page.goto('/account/login');

		// Try wrong password
		await page.fill('input[name=name]', name);
		await page.fill('input[name=password]', 'wrongpassword');
		await page.getByRole('button', { name: /sign in/i }).click();

		// Should stay on login page with an error message
		await expect(page).toHaveURL('/account/login');
		await expect(page.locator('body')).toContainText(/invalid|incorrect|wrong/i);
	});

	test('duplicate registration name shows error', async ({ page }) => {
		const name = `User_${UNIQUE()}`;

		// Register first time
		await page.goto('/account/register');
		await page.fill('input[name=name]', name);
		await page.fill('input[name=password]', 'pw12345');
		await page.fill('input[name=confirm]', 'pw12345');
		await page.getByRole('button', { name: /create account/i }).click();
		await page.waitForURL('/account/groups');

		// Logout and try to register again with same name
		await page.context().clearCookies();
		await page.goto('/account/register');
		await page.fill('input[name=name]', name);
		await page.fill('input[name=password]', 'pw12345');
		await page.fill('input[name=confirm]', 'pw12345');
		await page.getByRole('button', { name: /create account/i }).click();

		await expect(page.locator('body')).toContainText(/taken|already/i);
	});

	test('unauthenticated user is redirected to login from main page', async ({ page }) => {
		// Clear cookies (fresh context has no cookies)
		await page.context().clearCookies();
		await page.goto('/');
		await page.waitForURL('/account/login');
		await expect(page).toHaveURL('/account/login');
	});
});
