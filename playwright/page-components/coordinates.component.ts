import { expect, type Page } from '@playwright/test';

import { CommonComponent } from './common.component.ts';
import { runPageValidation, type PageValidation } from '../page-utilities/page-validation.utility.ts';

const DEFAULT_TIMEOUT = 12_000;

export type SiteCoordinates = {
	easting: string;
	northing: string;
};

export type SiteCoordinatesError =
	'eastingMustContainSixDigits' | 'eastingMustBeNumber' | 'northingMustContainSixDigits' | 'northingMustBeNumber';

type SiteCoordinatesField = 'siteEasting' | 'siteNorthing';

type SiteCoordinatesErrorExpectation = {
	message: string;
	fieldId: SiteCoordinatesField;
	inlineErrorId: string;
};

type SiteCoordinatesPageOptions = {
	expectedTitle?: string;
	expectedUrlContains?: string | string[];
	pageValidation?: PageValidation;
	timeout?: number;
};

const siteCoordinatesErrorMap: Record<SiteCoordinatesError, SiteCoordinatesErrorExpectation> = {
	eastingMustContainSixDigits: {
		message: 'The Easting grid reference must contain 6 digits',
		fieldId: 'siteEasting',
		inlineErrorId: 'siteEasting-error'
	},

	eastingMustBeNumber: {
		message: 'The Easting grid reference must be a number',
		fieldId: 'siteEasting',
		inlineErrorId: 'siteEasting-error'
	},

	northingMustContainSixDigits: {
		message: 'The Northing grid reference must contain 6 digits',
		fieldId: 'siteNorthing',
		inlineErrorId: 'siteNorthing-error'
	},

	northingMustBeNumber: {
		message: 'The Northing grid reference must be a number',
		fieldId: 'siteNorthing',
		inlineErrorId: 'siteNorthing-error'
	}
};

export class CoordinatesComponent {
	private readonly page: Page;
	private readonly commonComponent: CommonComponent;

	constructor(page: Page) {
		this.page = page;
		this.commonComponent = new CommonComponent(page);
	}

	public readonly actions = {
		/**
		 * Enters one or both coordinate values.
		 * Verifies each field contains the value after filling.
		 */
		enterCoordinates: async (coordinates: Partial<SiteCoordinates>): Promise<Partial<SiteCoordinates>> => {
			if (coordinates.easting === undefined && coordinates.northing === undefined) {
				throw new Error('At least one coordinate must be provided: easting or northing');
			}

			if (coordinates.easting !== undefined) {
				const eastingField = this.page.locator('#siteEasting');

				await expect(eastingField, 'Easting field should be visible').toBeVisible();
				await eastingField.fill(coordinates.easting);
				await expect(eastingField, `Easting field should contain '${coordinates.easting}'`).toHaveValue(
					coordinates.easting
				);
			}

			if (coordinates.northing !== undefined) {
				const northingField = this.page.locator('#siteNorthing');

				await expect(northingField, 'Northing field should be visible').toBeVisible();
				await northingField.fill(coordinates.northing);
				await expect(northingField, `Northing field should contain '${coordinates.northing}'`).toHaveValue(
					coordinates.northing
				);
			}

			return coordinates;
		}
	};

	public readonly assertions = {
		/**
		 * Verifies the site coordinates page is displayed.
		 * Full validation also checks URL, hint text, fields, labels, and continue button.
		 */
		isPageDisplayed: async (options: SiteCoordinatesPageOptions = {}) => {
			const {
				expectedTitle = 'What are the coordinates',
				expectedUrlContains,
				pageValidation = 'fullValidation',
				timeout = DEFAULT_TIMEOUT
			} = options;

			await runPageValidation(
				pageValidation,
				async () => {
					if (expectedUrlContains) {
						await this.commonComponent.assertions.verifyPageURL(expectedUrlContains, {
							timeout
						});
					}
					await this.commonComponent.assertions.verifyPageTitle(expectedTitle, {
						timeout
					});
				},
				async () => {
					await expect(
						this.page.locator('#multi-field-hint', {
							hasText: 'Optional'
						}),
						'Optional hint should be visible'
					).toBeVisible({
						timeout
					});

					const expectedFields = [
						{
							fieldId: 'siteEasting',
							label: 'Easting'
						},
						{
							fieldId: 'siteNorthing',
							label: 'Northing'
						}
					];

					for (const field of expectedFields) {
						await expect(
							this.page.locator(`label[for="${field.fieldId}"]`, {
								hasText: field.label
							}),
							`Label '${field.label}' should be visible`
						).toBeVisible({
							timeout
						});

						const input = this.page.locator(`#${field.fieldId}`);

						await expect(input, `Input '${field.fieldId}' should be visible`).toBeVisible({
							timeout
						});
						await expect(input).toHaveAttribute('name', field.fieldId);
						await expect(input).toHaveAttribute('type', 'text');
					}

					const continueButton = this.page.locator('[data-cy="button-save-and-continue"]');

					await expect(continueButton, 'Continue button should be visible').toBeVisible({
						timeout
					});

					await expect(continueButton).toHaveAttribute('type', 'submit');
				}
			);

			return this.assertions;
		},

		/**
		 * Verifies coordinate validation errors.
		 * Checks the summary link, inline error, error class, and aria-describedby.
		 */
		hasCoordinateErrors: async (errors: SiteCoordinatesError | SiteCoordinatesError[]) => {
			const errorsToCheck = Array.isArray(errors) ? errors : [errors];
			const uniqueErrors = [...new Set(errorsToCheck)];

			await expect(
				this.page.locator('.govuk-error-summary__list li'),
				`Error summary should contain exactly ${uniqueErrors.length} error(s)`
			).toHaveCount(uniqueErrors.length);

			for (const error of uniqueErrors) {
				const expected = siteCoordinatesErrorMap[error];

				await this.commonComponent.assertions.verifyErrorSummary(expected.message, {
					href: `#${expected.fieldId}`,
					inlineId: expected.inlineErrorId
				});

				const field = this.page.locator(`#${expected.fieldId}`);

				await expect(field, `Field '${expected.fieldId}' should have an error class`).toHaveClass(/govuk-input--error/);
				await expect(field).toHaveAttribute('aria-describedby', expected.inlineErrorId);
			}

			return this.assertions;
		},

		/**
		 * Verifies no coordinate validation errors are displayed.
		 */
		hasNoCoordinateErrors: async () => {
			await expect(this.page.locator('.govuk-error-summary')).not.toBeAttached();
			await expect(this.page.locator('#siteEasting-error')).not.toBeAttached();
			await expect(this.page.locator('#siteNorthing-error')).not.toBeAttached();
			await expect(this.page.locator('#siteEasting')).not.toHaveClass(/govuk-input--error/);
			await expect(this.page.locator('#siteNorthing')).not.toHaveClass(/govuk-input--error/);

			return this.assertions;
		},

		/**
		 * Verifies both coordinate fields contain the expected values.
		 */
		hasCoordinateValues: async (expected: SiteCoordinates) => {
			await expect(this.page.locator('#siteEasting')).toHaveValue(expected.easting);
			await expect(this.page.locator('#siteNorthing')).toHaveValue(expected.northing);

			return this.assertions;
		}
	};
}
