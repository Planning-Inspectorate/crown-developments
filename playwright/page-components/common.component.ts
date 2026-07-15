import { expect, type Locator, type Page } from '@playwright/test';

const DEFAULT_VERIFY_TIMEOUT = 12_000;
const COOKIE_BANNER_TIMEOUT = 2_000;
const COOKIE_BUTTON_TIMEOUT = 3_000;
const COOKIE_HIDE_TIMEOUT = 5_000;

export type VerifyOptions = {
	timeout?: number;
};

export type ErrorSummaryOptions = VerifyOptions & {
	href?: string;
	inlineId?: string;
};

export type ActionButtonOption =
	'back' | 'addDetails' | 'addAnother' | 'saveAndContinue' | 'continue' | 'cancel' | 'save' | 'removeAndSave';

export class CommonComponent {
	private readonly page: Page;
	private readonly baseUrl?: string;

	constructor(page: Page, baseUrl = process.env.BASE_URL) {
		this.page = page;
		this.baseUrl = baseUrl?.replace(/\/+$/, '');
	}

	public readonly actions = {
		/**
		 * Clears cookies for the current browser context.
		 * Also clears local storage and session storage when the page
		 * is currently on a valid http or https origin.
		 */
		clearBrowserState: async () => {
			await this.page.context().clearCookies();

			const currentUrl = this.page.url();
			const hasStorageOrigin = currentUrl.startsWith('http://') || currentUrl.startsWith('https://');

			if (hasStorageOrigin) {
				await this.page.evaluate(() => {
					window.localStorage.clear();
					window.sessionStorage.clear();
				});
			}

			return this.actions;
		},

		/**
		 * Accepts the GOV.UK cookie banner if it appears.
		 * The method exits safely when the banner is not present,
		 * so it can be called at the start of any test.
		 */
		acceptCookiesIfVisible: async () => {
			const cookieBanner = this.page.locator('#global-cookie-message');

			const bannerIsVisible = await cookieBanner
				.waitFor({
					state: 'visible',
					timeout: COOKIE_BANNER_TIMEOUT
				})
				.then(() => true)
				.catch(() => false);

			if (!bannerIsVisible) {
				return this.actions;
			}

			const acceptButton = cookieBanner
				.getByRole('button', {
					name: 'Accept additional cookies',
					exact: true
				})
				.first();

			const acceptButtonIsVisible = await acceptButton.isVisible().catch(() => false);

			if (acceptButtonIsVisible) {
				await acceptButton.click({
					timeout: COOKIE_BUTTON_TIMEOUT
				});
			}

			const hideButton = this.page
				.locator('#global-cookie-message')
				.getByRole('button', {
					name: /hide cookie message/i
				})
				.first();

			const hideButtonIsVisible = await hideButton
				.waitFor({
					state: 'visible',
					timeout: COOKIE_BUTTON_TIMEOUT
				})
				.then(() => true)
				.catch(() => false);

			if (hideButtonIsVisible) {
				await hideButton.click({
					timeout: COOKIE_BUTTON_TIMEOUT
				});
			}

			await expect(this.page.locator('#global-cookie-message'), 'Cookie banner should no longer be visible').toBeHidden(
				{
					timeout: COOKIE_HIDE_TIMEOUT
				}
			);

			return this.actions;
		},

		/**
		 * Clicks a shared page action button or link.
		 * Some options support fallback locators, for example
		 * data-cy first and role-based lookup second.
		 */
		clickActionButton: async (option: ActionButtonOption) => {
			const selectorMap: Record<ActionButtonOption, Locator[]> = {
				back: [
					this.page.getByRole('link', {
						name: 'Back',
						exact: true
					})
				],

				addDetails: [
					this.page.getByRole('link', {
						name: 'Add details',
						exact: true
					})
				],

				addAnother: [
					this.page.getByRole('link', {
						name: 'Add another',
						exact: true
					})
				],

				saveAndContinue: [
					this.page.locator('[data-cy="button-save-and-continue"]'),
					this.page.getByRole('button', {
						name: 'Save and continue',
						exact: true
					})
				],

				continue: [
					this.page.locator('[data-cy="button-save-and-continue"]'),
					this.page.getByRole('button', {
						name: 'Continue',
						exact: true
					})
				],

				cancel: [
					this.page.getByRole('link', {
						name: 'Cancel',
						exact: true
					})
				],

				save: [
					this.page.getByRole('button', {
						name: 'Save',
						exact: true
					})
				],

				removeAndSave: [this.page.locator('[data-cy="button-remove-and-save"]')]
			};

			const candidates = selectorMap[option];

			for (const candidate of candidates) {
				if ((await candidate.count()) === 0) {
					continue;
				}

				const actionButton = candidate.first();
				const isVisible = await actionButton.isVisible().catch(() => false);

				if (!isVisible) {
					continue;
				}

				await expect(actionButton, `Action button '${option}' should be enabled`).toBeEnabled();
				await actionButton.click();

				return this.actions;
			}

			throw new Error(`Test Failed: Action button "${option}" was not found or was not visible`);
		}
	};

	public readonly assertions = {
		/**
		 * Verifies the page has finished loading.
		 * Uses document.readyState so the check is independent
		 * of any specific page content.
		 */
		verifyPageLoaded: async (pageName: string, options: VerifyOptions = {}) => {
			const timeout = options.timeout ?? DEFAULT_VERIFY_TIMEOUT;

			await expect
				.poll(async () => this.page.evaluate(() => document.readyState), {
					timeout,
					message: `${pageName} - page did not fully load in time - Test Failed`
				})
				.toBe('complete');

			return this.assertions;
		},

		/**
		 * Verifies the current URL contains one or more expected values.
		 * If a base URL is configured, the URL must also start with it.
		 */
		verifyPageURL: async (contains: string | string[], options: VerifyOptions = {}) => {
			const timeout = options.timeout ?? DEFAULT_VERIFY_TIMEOUT;
			const expectedParts = Array.isArray(contains) ? contains : [contains];

			await this.page.waitForLoadState('load', {
				timeout
			});

			if (this.baseUrl) {
				const expectedBaseUrl = this.baseUrl;

				await expect(this.page, `URL should start with '${expectedBaseUrl}'`).toHaveURL(
					(url) => url.href.startsWith(expectedBaseUrl),
					{ timeout }
				);
			}

			for (const expectedPart of expectedParts) {
				await expect(this.page, `URL should include '${expectedPart}'`).toHaveURL(
					(url) => url.href.includes(expectedPart),
					{ timeout }
				);
			}

			return this.assertions;
		},

		/**
		 * Verifies the visible h1 contains the expected title text.
		 * This uses partial matching so the page can include extra
		 * prefix or suffix text.
		 */
		verifyPageTitle: async (expectedTitle: string, options: VerifyOptions = {}) => {
			const timeout = options.timeout ?? DEFAULT_VERIFY_TIMEOUT;
			const pageTitle = this.page.locator('h1:visible').first();

			await expect(pageTitle, 'Page title should be visible').toBeVisible({
				timeout
			});
			await expect(pageTitle, `Page title should contain '${expectedTitle}'`).toContainText(expectedTitle, {
				timeout
			});

			return this.assertions;
		},

		/**
		 * Verifies a GOV.UK error summary contains the expected message.
		 * Optionally checks the summary link href and the matching
		 * inline error message.
		 */
		verifyErrorSummary: async (errorText: string, options: ErrorSummaryOptions = {}) => {
			const { href, inlineId, timeout = DEFAULT_VERIFY_TIMEOUT } = options;

			const errorSummary = this.page.locator('.govuk-error-summary');
			const errorSummaryTitle = this.page.locator('.govuk-error-summary__title');

			const errorSummaryLinkSelector = href
				? `.govuk-error-summary__list a[href="${href}"]`
				: '.govuk-error-summary__list a';

			const errorLink = this.page
				.locator(errorSummaryLinkSelector, {
					hasText: errorText
				})
				.first();

			await expect(errorSummary, 'GOV.UK error summary should be visible').toBeVisible({
				timeout
			});
			await expect(errorSummaryTitle, 'GOV.UK error summary title should be visible').toBeVisible({
				timeout
			});
			await expect(errorSummaryTitle).toContainText('There is a problem');
			await expect(errorLink, `Error summary should contain '${errorText}'`).toBeVisible({
				timeout
			});
			await expect(errorLink).toContainText(errorText);

			if (href) {
				await expect(errorLink).toHaveAttribute('href', href);
			}

			if (inlineId) {
				const inlineError = this.page.locator(`#${inlineId}`);

				await expect(inlineError, `Inline error '${inlineId}' should be visible`).toBeVisible({
					timeout
				});
				await expect(inlineError).toContainText(errorText);
			}

			return this.assertions;
		}
	};
}
