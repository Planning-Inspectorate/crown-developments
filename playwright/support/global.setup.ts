import { chromium, type FullConfig } from '@playwright/test';
import { config as dotenvConfig } from 'dotenv';

import { LoginMicrosoftPage } from '../page-objects/login-microsoft.page.ts';

dotenvConfig();

function requireEnv(name: string): string {
	const value = process.env[name];

	if (!value) {
		throw new Error(`Missing required environment variable: ${name}`);
	}

	return value;
}

async function globalSetup(config: FullConfig) {
	const baseURL = config.projects[0].use.baseURL ?? process.env.BASE_URL;

	if (!baseURL || typeof baseURL !== 'string') {
		throw new Error('Missing baseURL. Set use.baseURL in playwright.config.ts or BASE_URL in .env');
	}

	const email = requireEnv('ADMIN_USERNAME');
	const password = requireEnv('ADMIN_PASSWORD');

	const browser = await chromium.launch({ headless: true });
	const context = await browser.newContext();
	const page = await context.newPage();

	try {
		const msLogin = new LoginMicrosoftPage(page);

		await page.goto(baseURL, {
			waitUntil: 'domcontentloaded',
			timeout: 30_000
		});

		await msLogin.login(email, password);

		await page.locator('[href="/auth/signout"]').waitFor({
			state: 'visible',
			timeout: 30_000
		});

		await context.storageState({
			path: 'playwright/.auth/admin.json'
		});
	} finally {
		await browser.close();
	}
}

export default globalSetup;
