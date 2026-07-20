import { loadEnvFile } from 'node:process';
import { type Page } from '@playwright/test';
import { CasesPage } from '../page-objects/cases.page.ts';
import { LoginMicrosoftPage } from '../page-objects/microsoft-login.page.ts';

const MICROSOFT_LOGIN_DETECTION_TIMEOUT = 5_000;

let environmentVariablesLoaded = false;

function loadEnvironmentVariables(): void {
	if (environmentVariablesLoaded) {
		return;
	}

	try {
		loadEnvFile();
	} catch {
		// No .env file found. This is fine if environment variables are provided by CI.
	}

	environmentVariablesLoaded = true;
}

function requireEnv(name: string): string {
	loadEnvironmentVariables();

	const value = process.env[name];

	if (!value) {
		throw new Error(`Missing required environment variable: ${name}`);
	}

	return value;
}

/**
 * Logs in as the admin user and confirms the cases page is displayed.
 *
 * Use this when a spec needs a fresh login before each test instead of
 * the globally saved storage state.
 */
export async function msLogin(page: Page): Promise<void> {
	const email = requireEnv('ADMIN_USERNAME');
	const password = requireEnv('ADMIN_PASSWORD');

	const casesPage = new CasesPage(page);
	const loginMicrosoftPage = new LoginMicrosoftPage(page);

	console.log('[TEST] Navigating to cases page');
	await casesPage.actions.goto();

	const microsoftLoginIsVisible = await page
		.locator('input[name="loginfmt"]')
		.waitFor({
			state: 'visible',
			timeout: MICROSOFT_LOGIN_DETECTION_TIMEOUT
		})
		.then(() => true)
		.catch(() => false);

	if (microsoftLoginIsVisible) {
		console.log('[TEST] Microsoft login page displayed');
		await loginMicrosoftPage.login(email, password);
	} else {
		console.log('[TEST] Microsoft login page not displayed; user may already be authenticated');
	}

	console.log('[TEST] Checking cases page is displayed');
	await casesPage.assertions.isPageDisplayed();
}
