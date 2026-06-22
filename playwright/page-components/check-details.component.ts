import { expect, type Page } from '@playwright/test';

import { CommonComponent } from './common.component.ts';
import { runPageValidation, type PageValidation } from '../page-utilities/page-validation.utility.ts';

const DEFAULT_TIMEOUT = 12_000;
const DETAIL_ROW_SELECTOR =
	'tbody.govuk-table__body tr.govuk-table__row, dl.govuk-summary-list .govuk-summary-list__row';

export type CheckDetailsPageState = 'withoutDetails' | 'withDetails';
export type RowTextState = 'exists' | 'notExist';
export type CheckDetailsRowAction = 'change' | 'remove';

type CheckDetailsPageOptions = {
	state?: CheckDetailsPageState;
	expectedTitleParts?: string[];
	expectedUrlContains?: string | string[];
	emptyText?: string;
	expectedHeaders?: readonly string[];
	pageValidation?: PageValidation;
	timeout?: number;
};

type RowActionOptions = {
	expectChange?: boolean;
	expectRemove?: boolean;
	allowSingleRowWithoutRemove?: boolean;
};

export class CheckDetailsPage {
	private readonly page: Page;
	private readonly commonComponent: CommonComponent;

	constructor(page: Page) {
		this.page = page;
		this.commonComponent = new CommonComponent(page);
	}

	public readonly actions = {
		/**
		 * Clicks a Change or Remove action link for a specific details row.
		 *
		 * The row can be selected by row number, starting from 1, or by text
		 * contained within the row.
		 */
		clickAction: async (action: CheckDetailsRowAction, rowIdentifier: number | string = 1) => {
			const actionText = action === 'change' ? 'Change' : 'Remove';
			const rows = this.page.locator(DETAIL_ROW_SELECTOR);

			const row =
				typeof rowIdentifier === 'number'
					? rows.nth(rowIdentifier - 1)
					: rows.filter({ hasText: rowIdentifier }).first();

			await expect(
				row,
				typeof rowIdentifier === 'number'
					? `Expected row ${rowIdentifier} to exist`
					: `Expected a row containing '${rowIdentifier}' to exist`
			).toBeVisible();

			const actionLink = row
				.locator('a.govuk-link', {
					hasText: actionText
				})
				.first();

			await expect(actionLink, `${actionText} link should be visible`).toBeVisible();
			await actionLink.click();

			return this.actions;
		},

		/**
		 * Removes rows from the details list until the minimum row count
		 * is reached.
		 */
		removeAllRows: async (minimumRows = 0, confirmRemove?: () => Promise<void>) => {
			let rowCount = await this.page.locator(DETAIL_ROW_SELECTOR).count();

			while (rowCount > minimumRows) {
				await this.actions.clickAction('remove', 1);

				if (confirmRemove) {
					await confirmRemove();
				}

				await this.page.waitForLoadState('load');

				rowCount = await this.page.locator(DETAIL_ROW_SELECTOR).count();
			}

			return this.actions;
		}
	};

	public readonly assertions = {
		/**
		 * Verifies the Check details page is displayed.
		 *
		 * Basic validation checks the page load state and page title.
		 * Full validation also checks the URL, empty state, row state,
		 * and table headers when supplied.
		 */
		isPageDisplayed: async (options: CheckDetailsPageOptions = {}) => {
			const {
				state = 'withoutDetails',
				expectedTitleParts = ['Check', 'contact details'],
				expectedUrlContains,
				emptyText = 'No agent contacts found',
				expectedHeaders,
				pageValidation = 'fullValidation',
				timeout = DEFAULT_TIMEOUT
			} = options;

			await runPageValidation(
				pageValidation,
				async () => {
					await this.commonComponent.assertions.verifyPageLoaded(expectedTitleParts.join(' '), {
						timeout
					});

					for (const titlePart of expectedTitleParts) {
						await this.commonComponent.assertions.verifyPageTitle(titlePart, {
							timeout
						});
					}
				},
				async () => {
					if (expectedUrlContains) {
						await this.commonComponent.assertions.verifyPageURL(expectedUrlContains, {
							timeout
						});
					}

					if (state === 'withoutDetails') {
						await expect(
							this.page.locator('p.govuk-body', {
								hasText: emptyText
							}),
							`Empty state text should be '${emptyText}'`
						).toBeVisible({
							timeout
						});

						await expect(this.page.locator(DETAIL_ROW_SELECTOR), 'No detail rows should be shown').toHaveCount(0);
					}

					if (state === 'withDetails') {
						await expect(
							this.page.locator(DETAIL_ROW_SELECTOR),
							'At least one detail row should be shown'
						).not.toHaveCount(0);

						if (expectedHeaders) {
							await this.assertions.hasTableHeaders(expectedHeaders);
						}
					}
				}
			);

			return this.assertions;
		},

		/**
		 * Verifies that the details table is visible and contains the
		 * expected column headers.
		 */
		hasTableHeaders: async (expectedHeaders: readonly string[]) => {
			await expect(this.page.locator('table.govuk-table'), 'Details table should be visible').toBeVisible();

			for (const header of expectedHeaders) {
				await expect(
					this.page
						.locator('thead.govuk-table__head th', {
							hasText: header
						})
						.first(),
					`Table header '${header}' should be visible`
				).toBeVisible();
			}

			return this.assertions;
		},

		/**
		 * Verifies that row text exists or does not exist.
		 * When a row number is supplied, only that row is checked.
		 * When no row number is supplied, all rows are searched for a row
		 * containing every expected value.
		 */
		hasRowValues: async (expectedValues: string | string[], state: RowTextState = 'exists', rowNumber?: number) => {
			const values = (Array.isArray(expectedValues) ? expectedValues : [expectedValues]).filter(
				(value): value is string => Boolean(value?.trim())
			);

			if (values.length === 0) {
				return this.assertions;
			}

			if (state === 'notExist') {
				const scope = rowNumber
					? this.page.locator(DETAIL_ROW_SELECTOR).nth(rowNumber - 1)
					: this.page.locator('tbody.govuk-table__body, dl.govuk-summary-list').first();

				await expect(
					scope,
					rowNumber ? `Row ${rowNumber} should be visible` : 'Check details content should be visible'
				).toBeVisible();

				const scopeText = (await scope.innerText()).trim().replace(/\s+/g, ' ');

				for (const value of values) {
					expect(scopeText, `Expected row text not to contain '${value}'`).not.toContain(value);
				}

				return this.assertions;
			}

			if (rowNumber) {
				const row = this.page.locator(DETAIL_ROW_SELECTOR).nth(rowNumber - 1);

				await expect(row, `Row ${rowNumber} should be visible`).toBeVisible();

				const rowText = (await row.innerText()).trim().replace(/\s+/g, ' ');

				for (const value of values) {
					expect(rowText, `Expected row ${rowNumber} to contain '${value}'`).toContain(value);
				}

				return this.assertions;
			}

			const rows = this.page.locator(DETAIL_ROW_SELECTOR);
			const rowCount = await rows.count();

			expect(rowCount, 'Expected at least one detail row to exist').toBeGreaterThan(0);

			let matchingRowFound = false;

			for (let rowIndex = 0; rowIndex < rowCount; rowIndex++) {
				const row = rows.nth(rowIndex);
				const rowText = (await row.innerText()).trim().replace(/\s+/g, ' ');
				const rowContainsAllValues = values.every((value) => rowText.includes(value));

				if (rowContainsAllValues) {
					matchingRowFound = true;
					break;
				}
			}

			expect(matchingRowFound, `Expected a row to contain: ${values.join(', ')}`).toBe(true);

			return this.assertions;
		},

		/**
		 * Verifies Change and Remove action links are shown for each
		 * details row.
		 */
		hasRowActions: async (options: RowActionOptions = {}) => {
			const { expectChange = true, expectRemove = true, allowSingleRowWithoutRemove = false } = options;

			const rows = this.page.locator(DETAIL_ROW_SELECTOR);
			const rowCount = await rows.count();

			expect(rowCount, 'Expected at least one detail row to exist').toBeGreaterThan(0);

			for (let rowIndex = 0; rowIndex < rowCount; rowIndex++) {
				const row = rows.nth(rowIndex);

				if (expectChange) {
					await expect(
						row
							.locator('a.govuk-link', {
								hasText: 'Change'
							})
							.first(),
						`Change link should be visible for row ${rowIndex + 1}`
					).toBeVisible();
				}

				if (expectRemove && !(allowSingleRowWithoutRemove && rowCount === 1)) {
					await expect(
						row
							.locator('a.govuk-link', {
								hasText: 'Remove'
							})
							.first(),
						`Remove link should be visible for row ${rowIndex + 1}`
					).toBeVisible();
				}
			}

			return this.assertions;
		},

		verifyErrorOneRequired: async () => {
			await this.commonComponent.assertions.verifyErrorSummary('At least one contact is required', {
				href: '#manageAgentContactDetails'
			});

			return this.assertions;
		}
	};
}
