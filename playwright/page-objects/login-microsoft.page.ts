import type { Page } from '@playwright/test';

const MICROSOFT_LOGIN_FIELD_TIMEOUT = 30_000;

export class LoginMicrosoftPage {
	private readonly page: Page;

	constructor(page: Page) {
		this.page = page;
	}

	async clickSubmitButton(): Promise<void> {
		const button = this.page.locator('#idSIButton9');

		await button.waitFor({
			state: 'visible',
			timeout: MICROSOFT_LOGIN_FIELD_TIMEOUT
		});

		await button.click();
	}

	async enterEmail(email: string): Promise<void> {
		const emailField = this.page.locator('input[name="loginfmt"]');

		await emailField.waitFor({
			state: 'visible',
			timeout: MICROSOFT_LOGIN_FIELD_TIMEOUT
		});

		await emailField.fill(email);
	}

	async enterPassword(password: string): Promise<void> {
		const passwordField = this.page.locator('input[name="passwd"]');

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
