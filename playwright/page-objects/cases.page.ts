import type { Locator, Page } from '@playwright/test';
import { expect } from '@playwright/test';

import { HeaderUtility } from './header.utility.ts';

type CaseTableColumn = 'Reference' | 'Site location' | 'Local planning authority (LPA)' | 'Application type' | 'Status';

export class CasesPage {
	private readonly page: Page;
	private readonly headerUtility: HeaderUtility;

	constructor(page: Page) {
		this.page = page;
		this.headerUtility = new HeaderUtility(page);
	}

	private readonly locators = {
		pageHeading: (): Locator => this.page.locator('h1.govuk-heading-xl'),
		searchForm: (): Locator => this.page.locator('#search-bar-form'),
		searchLabel: (): Locator => this.page.locator('#search-label'),
		searchHint: (): Locator => this.page.locator('#search-hint'),
		searchInput: (): Locator => this.page.locator('#search-input'),
		searchButton: (): Locator => this.page.locator('#search-button'),
		createCaseLink: (): Locator => this.page.locator('#create-case-link'),
		casesTable: (): Locator => this.page.locator('table.govuk-table'),
		tableRows: (): Locator => this.page.locator('tbody.govuk-table__body tr.govuk-table__row'),

		tableColumnHeader: (name: CaseTableColumn): Locator =>
			this.page.getByRole('button', {
				name,
				exact: true
			}),

		referenceLink: (reference: string): Locator =>
			this.page.locator('table.govuk-table').getByRole('link', {
				name: reference,
				exact: true
			})
	};

	public readonly assertions = {
		isPageDisplayed: async () => {
			try {
				await this.page.waitForURL(/\/cases(?:\?.*)?$/i, {
					timeout: 30_000
				});
			} catch {
				throw new Error('Test failed: Cases page did not load within 30 seconds');
			}

			await this.headerUtility.assertions.isHeaderDisplayed();

			await expect(this.locators.pageHeading()).toBeVisible();
			await expect(this.locators.pageHeading()).toContainText('Manage Crown Development applications');
			await expect(this.locators.searchForm()).toBeVisible();
			await expect(this.locators.searchLabel()).toBeVisible();
			await expect(this.locators.searchLabel()).toContainText('Search cases');
			await expect(this.locators.searchHint()).toBeVisible();
			await expect(this.locators.searchHint()).toContainText('To find a specific case, search by reference.');
			await expect(this.locators.searchInput()).toBeVisible();
			await expect(this.locators.searchButton()).toBeVisible();
			await expect(this.locators.searchButton()).toContainText('Search');
			await expect(this.locators.createCaseLink()).toBeVisible();
			await expect(this.locators.createCaseLink()).toContainText('Create a case');
			await expect(this.locators.createCaseLink()).toHaveAttribute('href', '/cases/create-a-case');
			await expect(this.locators.casesTable()).toBeVisible();
			await expect(this.locators.tableColumnHeader('Reference')).toBeVisible();
			await expect(this.locators.tableColumnHeader('Site location')).toBeVisible();
			await expect(this.locators.tableColumnHeader('Local planning authority (LPA)')).toBeVisible();
			await expect(this.locators.tableColumnHeader('Application type')).toBeVisible();
			await expect(this.locators.tableColumnHeader('Status')).toBeVisible();
			return this.assertions;
		},

		isReferenceDisplayed: async (reference: string) => {
			await expect(this.locators.referenceLink(reference), `Reference '${reference}' should be visible`).toBeVisible();
			return this.assertions;
		},

		searchInputHasValue: async (expectedValue: string) => {
			await expect(this.locators.searchInput()).toHaveValue(expectedValue);
			return this.assertions;
		},

		urlContains: async (expectedUrl: string | RegExp) => {
			await expect(this.page).toHaveURL(expectedUrl);
			return this.assertions;
		}
	};

	public readonly actions = {
		goto: async () => {
			await this.page.goto('/cases');

			return this.actions;
		},

		clickCreateACase: async () => {
			const createCaseLink = this.locators.createCaseLink();

			await expect(createCaseLink, 'Create a case link should be visible before clicking').toBeVisible();

			await Promise.all([
				this.page.waitForURL('**/cases/create-a-case**', {
					timeout: 15_000
				}),
				createCaseLink.click()
			]);

			return this.actions;
		},

		typeSearchCases: async (searchText: string) => {
			const searchInput = this.locators.searchInput();

			await expect(searchInput, 'Search input should be visible before typing').toBeVisible();
			await searchInput.fill(searchText);
			return this.actions;
		},

		clickSearchCasesButton: async () => {
			const searchButton = this.locators.searchButton();

			await expect(searchButton, 'Search button should be visible before clicking').toBeVisible();

			await Promise.all([
				this.page.waitForURL(
					(url) =>
						url.pathname === '/cases' &&
						url.searchParams.get('page') === '1' &&
						!!url.searchParams.get('searchCriteria'),
					{
						timeout: 15_000
					}
				),
				searchButton.click()
			]);

			return this.actions;
		},

		searchCases: async (searchText: string) => {
			await this.actions.typeSearchCases(searchText);
			await this.actions.clickSearchCasesButton();
			return this.actions;
		},

		clickReference: async (reference: string) => {
			const referenceLink = this.locators.referenceLink(reference);

			await expect(referenceLink, `Reference link '${reference}' should be visible before clicking`).toBeVisible();
			await Promise.all([
				this.page.waitForURL(/\/cases\/.+/i, {
					timeout: 15_000
				}),
				referenceLink.click()
			]);
			return this.actions;
		},

		getCaseRowsCount: async (): Promise<number> => {
			return await this.locators.tableRows().count();
		}
	};
}
