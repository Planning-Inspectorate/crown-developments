import { mkdir } from 'node:fs/promises';
import { loadEnvFile } from 'node:process';

import { chromium, type FullConfig } from '@playwright/test';

import { LoginMicrosoftPage } from '../page-objects/login-microsoft.page.ts';

const AUTH_STORAGE_DIRECTORY = 'playwright/.auth';
const AUTH_STORAGE_STATE_PATH = `${AUTH_STORAGE_DIRECTORY}/admin.json`;
const PAGE_LOAD_TIMEOUT = 30_000;

function loadEnvironmentVariables(): void {
	try {
		loadEnvFile();
	} catch {
		// No .env file found. This is fine if environment variables are provided by CI.
	}
}

function requireEnv(name: string): string {
	const value = process.env[name];

	if (!value) {
		throw new Error(`Missing required environment variable: ${name}`);
	}

	return value;
}

async function globalSetup(config: FullConfig): Promise<void> {
	loadEnvironmentVariables();

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
			timeout: PAGE_LOAD_TIMEOUT
		});

		await msLogin.login(email, password);

		await page.locator('[href="/auth/signout"]').waitFor({
			state: 'visible',
			timeout: PAGE_LOAD_TIMEOUT
		});

		await mkdir(AUTH_STORAGE_DIRECTORY, { recursive: true });

		await context.storageState({
			path: AUTH_STORAGE_STATE_PATH
		});
	} finally {
		await browser.close();
	}
}

export default globalSetup;
