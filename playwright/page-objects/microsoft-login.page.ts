import type { Page } from '@playwright/test';

import { PAGE_TIMEOUTS } from '../support/test-timeouts.ts';

const MICROSOFT_LOGIN_FIELD_TIMEOUT = PAGE_TIMEOUTS.microsoft;

export class LoginMicrosoftPage {
	private readonly loginPage: Page;

	constructor(loginPage: Page) {
		this.loginPage = loginPage;
	}

	async clickSubmitButton(): Promise<void> {
		const button = this.loginPage.locator('#idSIButton9');

		await button.waitFor({
			state: 'visible',
			timeout: MICROSOFT_LOGIN_FIELD_TIMEOUT
		});

		await button.click();
	}

	async enterEmail(email: string): Promise<void> {
		const emailField = this.loginPage.locator('input[name="loginfmt"]');

		await emailField.waitFor({
			state: 'visible',
			timeout: MICROSOFT_LOGIN_FIELD_TIMEOUT
		});

		await emailField.fill(email);
	}

	async enterPassword(password: string): Promise<void> {
		const passwordField = this.loginPage.locator('input[name="passwd"]');

		await passwordField.waitFor({
			state: 'visible',
			timeout: MICROSOFT_LOGIN_FIELD_TIMEOUT
		});

		await passwordField.fill(password);
	}

	async login(email: string, password: string): Promise<void> {
		await this.enterEmail(email);
		await this.clickSubmitButton();

		await this.enterPassword(password);
		await this.clickSubmitButton();
	}
}
