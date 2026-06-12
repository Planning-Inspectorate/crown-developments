import type { Locator, Page } from '@playwright/test';
import { expect } from '@playwright/test';

type HeaderLink = 'allCases' | 'signOut';

export class HeaderUtility {
	private readonly page: Page;

	constructor(page: Page) {
		this.page = page;
	}

	private readonly locators = {
		header: (): Locator => this.page.locator('.pins-row'),
		leftColumn: (): Locator => this.page.locator('.pins-row .pins-column--left'),
		centralColumn: (): Locator => this.page.locator('.pins-row .pins-column--central'),
		serviceName: (): Locator => this.page.locator('.pins-header-service-name'),
		navigation: (): Locator => this.page.locator('nav.pins-header-navigation'),
		navLink: (text: string): Locator =>
			this.page.locator('nav.pins-header-navigation').locator('a.govuk-header__link', {
				hasText: text
			})
	};

	public readonly assertions = {
		isHeaderDisplayed: async () => {
			await expect(this.locators.header()).toBeVisible();
			await expect(this.locators.leftColumn()).toContainText('Planning Inspectorate');
			await expect(this.locators.centralColumn()).toBeVisible();
			await expect(this.locators.serviceName()).toContainText('Manage a Crown Development Application');
			await expect(this.locators.navigation()).toBeVisible();
			await expect(this.locators.navLink('All cases')).toBeVisible();
			await expect(this.locators.navLink('All cases')).toHaveAttribute('href', '/cases');
			await expect(this.locators.navLink('Sign out')).toBeVisible();
			await expect(this.locators.navLink('Sign out')).toHaveAttribute('href', '/auth/signout');
			return this.assertions;
		},

		hasHeaderLink: async (option: HeaderLink) => {
			const linkTextMap: Record<HeaderLink, string> = {
				allCases: 'All cases',
				signOut: 'Sign out'
			};
			const link = this.locators.navLink(linkTextMap[option]);

			await expect(link, `Header link '${linkTextMap[option]}' should be visible`).toBeVisible();
			return this.assertions;
		}
	};

	public readonly actions = {
		clickHeaderLink: async (option: HeaderLink) => {
			const linkTextMap: Record<HeaderLink, string> = {
				allCases: 'All cases',
				signOut: 'Sign out'
			};
			const link = this.locators.navLink(linkTextMap[option]);

			await expect(link, `Header link '${linkTextMap[option]}' should be visible before clicking`).toBeVisible();
			await link.click();
			return this.actions;
		},

		clickAllCases: async () => {
			await this.actions.clickHeaderLink('allCases');
			return this.actions;
		},

		clickSignOut: async () => {
			await this.actions.clickHeaderLink('signOut');
			return this.actions;
		}
	};
}
