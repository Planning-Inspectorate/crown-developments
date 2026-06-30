import { expect, type Page } from '@playwright/test';

import { CommonComponent } from './common.component.ts';
import {
	generateRandomDate,
	generateRandomDateByDayOffset,
	type DateDirection,
	type DateField
} from '../page-utilities/generate.utility.ts';

type DatePart = 'day' | 'month' | 'year';

export type DateErrorState =
	| 'allEmpty'
	| 'dayOnly'
	| 'monthOnly'
	| 'yearOnly'
	| 'dayMonthOnly'
	| 'dayYearOnly'
	| 'monthYearOnly'
	| 'invalidDay'
	| 'invalidMonth'
	| 'invalidYear';

type DateErrorExpectation = {
	summary: Array<{ field: DatePart; message: string }>;
	inline?: string;
};

type DateUtilityOptions = {
	fieldPrefix?: string;
	dateName?: string;
};

function createDateErrorMap(dateName: string): Record<DateErrorState, DateErrorExpectation> {
	return {
		allEmpty: {
			summary: [
				{
					field: 'month',
					message: `${dateName} month must be between 1 and 12`
				},
				{
					field: 'year',
					message: `${dateName} year must include 4 numbers`
				},
				{
					field: 'day',
					message: `${dateName} day must be a real day`
				}
			],
			inline: `Enter ${dateName}`
		},

		dayOnly: {
			summary: [
				{
					field: 'month',
					message: `${dateName} must include a month and year`
				}
			],
			inline: `${dateName} must include a month and year`
		},

		monthOnly: {
			summary: [
				{
					field: 'day',
					message: `${dateName} must include a day and year`
				}
			],
			inline: `${dateName} must include a day and year`
		},

		yearOnly: {
			summary: [
				{
					field: 'day',
					message: `${dateName} must include a day and month`
				}
			],
			inline: `${dateName} must include a day and month`
		},

		dayMonthOnly: {
			summary: [
				{
					field: 'year',
					message: `${dateName} must include a year`
				}
			],
			inline: `${dateName} must include a year`
		},

		dayYearOnly: {
			summary: [
				{
					field: 'month',
					message: `${dateName} must include a month`
				}
			],
			inline: `${dateName} must include a month`
		},

		monthYearOnly: {
			summary: [
				{
					field: 'day',
					message: `${dateName} must include a day`
				}
			],
			inline: `${dateName} must include a day`
		},

		invalidDay: {
			summary: [
				{
					field: 'day',
					message: `${dateName} day must be a real day`
				}
			],
			inline: `${dateName} day must be a real day`
		},

		invalidMonth: {
			summary: [
				{
					field: 'month',
					message: `${dateName} month must be between 1 and 12`
				}
			],
			inline: `${dateName} month must be between 1 and 12`
		},

		invalidYear: {
			summary: [
				{
					field: 'year',
					message: `${dateName} year must include 4 numbers`
				}
			],
			inline: `${dateName} year must include 4 numbers`
		}
	};
}

export class DateUtility {
	private readonly page: Page;
	private readonly commonComponent: CommonComponent;
	private readonly fieldPrefix: string;
	private readonly dateName: string;

	constructor(page: Page, options: DateUtilityOptions = {}) {
		this.page = page;
		this.commonComponent = new CommonComponent(page);
		this.fieldPrefix = options.fieldPrefix ?? 'receivedDate';
		this.dateName = options.dateName ?? 'Received date of submission';
	}

	/**
	 * Enters day, month, and year values into the configured date fields.
	 */
	private async fillDateFields(date: DateField): Promise<void> {
		const dayField = this.page.locator(`#${this.fieldPrefix}_day`);
		const monthField = this.page.locator(`#${this.fieldPrefix}_month`);
		const yearField = this.page.locator(`#${this.fieldPrefix}_year`);

		await expect(dayField, 'Day field should be visible before entering a value').toBeVisible();
		await dayField.fill(date.day);
		await expect(dayField).toHaveValue(date.day);

		await expect(monthField, 'Month field should be visible before entering a value').toBeVisible();
		await monthField.fill(date.month);
		await expect(monthField).toHaveValue(date.month);

		await expect(yearField, 'Year field should be visible before entering a value').toBeVisible();
		await yearField.fill(date.year);
		await expect(yearField).toHaveValue(date.year);
	}

	public readonly actions = {
		/**
		 * Enters a supplied date, or a generated random date.
		 */
		enterDate: async (date?: DateField): Promise<DateField> => {
			const valueToUse = date ?? generateRandomDate();

			await this.fillDateFields(valueToUse);

			return valueToUse;
		},

		/**
		 * Enters a generated date before or after a reference date.
		 */
		enterRandomDateByDayOffset: async (
			referenceDate: DateField,
			minimumDays: number,
			direction: DateDirection,
			maximumDays = 365
		): Promise<DateField> => {
			const valueToUse = generateRandomDateByDayOffset(referenceDate, minimumDays, direction, maximumDays);

			await this.fillDateFields(valueToUse);

			return valueToUse;
		}
	};

	public readonly assertions = {
		/**
		 * Verifies the expected date validation state.
		 * Uses the configured date name and field prefix for this page.
		 */
		hasDateErrorState: async (state: DateErrorState) => {
			const expected = createDateErrorMap(this.dateName)[state];

			await expect(
				this.page.locator('.govuk-error-summary__list li'),
				`Error summary should contain exactly ${expected.summary.length} error(s)`
			).toHaveCount(expected.summary.length);

			for (const item of expected.summary) {
				await this.commonComponent.assertions.verifyErrorSummary(item.message, {
					href: `#${this.fieldPrefix}_${item.field}`
				});
			}

			if (expected.inline !== undefined) {
				const inlineError = this.page.locator(`#${this.fieldPrefix}-error`);

				await expect(inlineError, `${this.dateName} inline error should be visible`).toBeVisible();
				await expect(inlineError).toContainText(expected.inline);
			}

			return this.assertions;
		},

		/**
		 * Verifies the configured date fields contain the expected values.
		 */
		hasDateValue: async (date: DateField) => {
			await expect(this.page.locator(`#${this.fieldPrefix}_day`)).toHaveValue(date.day);
			await expect(this.page.locator(`#${this.fieldPrefix}_month`)).toHaveValue(date.month);
			await expect(this.page.locator(`#${this.fieldPrefix}_year`)).toHaveValue(date.year);

			return this.assertions;
		}
	};
}
