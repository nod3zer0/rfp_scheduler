import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
	testDir: './tests',
	fullyParallel: true,
	forbidOnly: !!process.env.CI,
	retries: process.env.CI ? 2 : 0,
	workers: process.env.CI ? 1 : undefined,
	reporter: 'html',

	use: {
		baseURL: 'http://localhost:4173',
		trace: 'on-first-retry'
	},

	projects: [
		{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }
	],

	webServer: {
		command: 'DATABASE_PATH=./rfpsquad-test.db npx drizzle-kit push --force && npm run build && npm run preview',
		port: 4173,
		reuseExistingServer: !process.env.CI,
		env: {
			DATABASE_PATH: './rfpsquad-test.db',
			ORIGIN: 'http://localhost:4173'
		}
	}
});
