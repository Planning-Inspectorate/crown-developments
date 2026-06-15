import { defineConfig, devices } from '@playwright/test';
import { loadEnvFile } from 'node:process';

loadEnvFile();

export default defineConfig({
	testDir: './playwright/tests',
	globalSetup: './playwright/support/global.setup.ts',

	timeout: 30_000,

	expect: {
		timeout: 5_000
	},

	fullyParallel: true,
	retries: process.env.CI ? 2 : 0,
	workers: process.env.CI ? 1 : undefined,

	reporter: [['html'], ['list']],

	use: {
		baseURL: process.env.BASE_URL || 'http://localhost:3000',
		storageState: 'playwright/.auth/admin.json',
		trace: 'on-first-retry',
		screenshot: 'only-on-failure',
		video: 'retain-on-failure',
		acceptDownloads: true
	},

	outputDir: './playwright/downloads/test-results',

	projects: [
		{
			name: 'chromium',
			use: { ...devices['Desktop Chrome'] }
		}
	]
});
