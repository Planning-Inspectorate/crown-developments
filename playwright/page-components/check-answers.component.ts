import { expect, type Locator, type Page } from '@playwright/test';

import { CommonComponent } from './common.component.ts';
import { runPageValidation, type PageValidation } from '../page-utilities/page-validation.utility.ts';

const DEFAULT_TIMEOUT = 12_000;

export type CheckYourAnswersAction = 'Change' | 'Answer';
export type CheckYourAnswersRowRule = 'mandatory' | 'optional';

type CheckAnswersPageOptions = {
	expectedTitle?: string;
	expectedUrlContains?: string | string[];
	expectedKeys?: readonly string[];
	expectedWarningText?: string;
	submitButtonText?: string;
	pageValidation?: PageValidation;
	timeout?: number;
};

type ValidateCheckYourAnswersRowsOptions = {
	mandatoryKeys?: readonly string[];
	optionalKeys?: readonly string[];
};

export class CheckAnswersPage {
	private readonly page: Page;
	private readonly commonComponent: CommonComponent;

	constructor(page: Page) {
		this.page = page;
		this.commonComponent = new CommonComponent(page);
	}

	/**
	 * Normalises text from the page by trimming leading and trailing
	 * whitespace and replacing multiple spaces or line breaks with a
	 * single space.
	 */
	private normaliseText(text: string): string {
		return text.trim().replace(/\s+/g, ' ');
	}

	/**
	 * Finds a GOV.UK summary list row by its key text.
	 *
	 * This is used to find rows on the Check your answers page without
	 * relying on fixed row order.
	 */
	private async getSummaryRowByKey(keyText: string): Promise<Locator> {
		const rows = this.page.locator('.govuk-summary-list__row');
		const rowCount = await rows.count();

		for (let rowIndex = 0; rowIndex < rowCount; rowIndex++) {
			const row = rows.nth(rowIndex);
			const key = row.locator('.govuk-summary-list__key').first();

			if ((await key.count()) === 0) {
				continue;
			}

			const actualKeyText = this.normaliseText(await key.innerText());

			if (actualKeyText === keyText) {
				return row;
			}
		}

		throw new Error(`Check your answers row '${keyText}' was not found`);
	}

	public readonly actions = {
		/**
		 * Clicks the Change or Answer action link for a given Check your
		 * answers row.
		 *
		 * Optionally verifies that the action text matches the expected
		 * action before clicking.
		 */
		clickCheckYourAnswersAction: async (keyText: string, expectedAction?: CheckYourAnswersAction) => {
			const row = await this.getSummaryRowByKey(keyText);
			const actionLink = row.locator('.govuk-summary-list__actions a.govuk-link').first();

			await expect(actionLink, `Action link for '${keyText}' should be visible`).toBeVisible();

			const actionText = this.normaliseText(await actionLink.innerText());

			if (expectedAction && !actionText.includes(expectedAction)) {
				throw new Error(`Expected action '${expectedAction}' for '${keyText}' but found '${actionText}'`);
			}

			await actionLink.click();

			return this.actions;
		}
	};

	public readonly assertions = {
		/**
		 * Verifies the Check your answers page is displayed.
		 *
		 * Basic validation checks the page load state and page title.
		 * Full validation also checks the URL, summary list, expected keys,
		 * row structure, optional warning text, and submit button.
		 */
		isPageDisplayed: async (options: CheckAnswersPageOptions = {}) => {
			const {
				expectedTitle = 'Check your answers',
				expectedUrlContains,
				expectedKeys = [],
				expectedWarningText,
				submitButtonText = 'Accept & Submit',
				pageValidation = 'fullValidation',
				timeout = DEFAULT_TIMEOUT
			} = options;

			await runPageValidation(
				pageValidation,
				async () => {
					await this.commonComponent.assertions.verifyPageLoaded(expectedTitle, {
						timeout
					});

					await this.commonComponent.assertions.verifyPageTitle(expectedTitle, {
						timeout
					});
				},
				async () => {
					if (expectedUrlContains) {
						await this.commonComponent.assertions.verifyPageURL(expectedUrlContains, {
							timeout
						});
					}

					await expect(
						this.page.locator('dl.govuk-summary-list'),
						'Check your answers summary list should be visible'
					).toBeVisible({
						timeout
					});

					for (const keyText of expectedKeys) {
						const row = await this.getSummaryRowByKey(keyText);

						await expect(
							row.locator('.govuk-summary-list__key').first(),
							`Summary key '${keyText}' should be visible`
						).toBeVisible({
							timeout
						});
					}

					const rows = this.page.locator('.govuk-summary-list__row');
					const rowCount = await rows.count();

					expect(rowCount, 'Check your answers page should contain at least one summary row').toBeGreaterThan(0);

					for (let rowIndex = 0; rowIndex < rowCount; rowIndex++) {
						const row = rows.nth(rowIndex);

						await expect(
							row.locator('.govuk-summary-list__value').first(),
							`Summary row ${rowIndex + 1} should contain a value element`
						).toBeAttached();

						await expect(
							row.locator('.govuk-summary-list__actions a.govuk-link').first(),
							`Summary row ${rowIndex + 1} should contain an action link`
						).toBeVisible({
							timeout
						});
					}

					if (expectedWarningText) {
						await expect(
							this.page.locator('.govuk-warning-text', {
								hasText: expectedWarningText
							}),
							`Warning text '${expectedWarningText}' should be visible`
						).toBeVisible({
							timeout
						});
					}

					const submitButton = this.page.getByRole('button', {
						name: submitButtonText,
						exact: true
					});

					await expect(submitButton, `${submitButtonText} button should be visible`).toBeVisible({
						timeout
					});

					await expect(submitButton).toHaveAttribute('type', 'submit');
				}
			);

			return this.assertions;
		},

		/**
		 * Validates mandatory and optional rows on the Check your answers page.
		 *
		 * Mandatory rows must always have a Change action.
		 * Optional rows must have Change when a value exists, or Answer when
		 * the value is empty.
		 */
		validateCheckYourAnswersRows: async (options: ValidateCheckYourAnswersRowsOptions = {}) => {
			const { mandatoryKeys = [], optionalKeys = [] } = options;

			const assertRow = async (keyText: string, rule: CheckYourAnswersRowRule) => {
				const row = await this.getSummaryRowByKey(keyText);
				const value = row.locator('.govuk-summary-list__value').first();
				const actionLink = row.locator('.govuk-summary-list__actions a.govuk-link').first();

				await expect(value, `Value for '${keyText}' should exist`).toBeAttached();
				await expect(actionLink, `Action link for '${keyText}' should be visible`).toBeVisible();

				const valueText = this.normaliseText(await value.innerText());
				const actionText = this.normaliseText(await actionLink.innerText());

				if (rule === 'mandatory') {
					expect(actionText, `Mandatory row '${keyText}' should have a Change action`).toContain('Change');

					return;
				}

				if (valueText.length > 0) {
					expect(actionText, `Optional row '${keyText}' with a value should have a Change action`).toContain('Change');

					return;
				}

				expect(actionText, `Optional row '${keyText}' without a value should have an Answer action`).toContain(
					'Answer'
				);
			};

			for (const keyText of mandatoryKeys) {
				await assertRow(keyText, 'mandatory');
			}

			for (const keyText of optionalKeys) {
				await assertRow(keyText, 'optional');
			}

			return this.assertions;
		},

		hasRowValues: async (keyText: string, expectedValues: string | string[]) => {
			const values = (Array.isArray(expectedValues) ? expectedValues : [expectedValues]).filter(
				(value): value is string => Boolean(value?.trim())
			);

			if (values.length === 0) {
				return this.assertions;
			}

			const row = await this.getSummaryRowByKey(keyText);
			const value = row.locator('.govuk-summary-list__value').first();

			await expect(value, `Value for '${keyText}' should exist`).toBeAttached();

			const actualText = this.normaliseText(await value.innerText());

			for (const expectedValue of values) {
				const trimmedExpectedValue = expectedValue.trim();

				expect(
					actualText,
					[
						'Check Your Answers validation failed',
						`Row: '${keyText}'`,
						`Expected value: '${trimmedExpectedValue}'`,
						`Actual value: '${actualText}'`
					].join('\n')
				).toContain(trimmedExpectedValue);
			}

			return this.assertions;
		},

		/**
		 * Verifies that a Check your answers row contains one or more
		 * expected values.
		 *
		 * Empty expected values are ignored.
		 */
		hasRowAction: async (keyText: string, expectedAction: CheckYourAnswersAction) => {
			const row = await this.getSummaryRowByKey(keyText);
			const actionLink = row.locator('.govuk-summary-list__actions a.govuk-link').first();

			await expect(actionLink, `Action link for '${keyText}' should be visible`).toBeVisible();

			const actionText = this.normaliseText(await actionLink.innerText());

			expect(actionText, `Expected action '${expectedAction}' for '${keyText}'`).toContain(expectedAction);

			return this.assertions;
		}
	};
}
