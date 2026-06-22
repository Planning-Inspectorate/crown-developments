import { expect, type Page } from '@playwright/test';

import { CommonComponent } from './common.component.ts';
import {
	generateRandomDate,
	generateRandomDateByDayOffset,
	type DateDirection,
	type DateField
} from '../page-utilities/generate.utility.ts';

type DateString = 'day' | 'month' | 'year';

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
	summary: Array<{ field: DateString; message: string }>;
	inline?: string;
};

const dateErrorMap: Record<DateErrorState, DateErrorExpectation> = {
	allEmpty: {
		summary: [
			{
				field: 'month',
				message: 'Received date of submission month must be between 1 and 12'
			},
			{
				field: 'year',
				message: 'Received date of submission year must include 4 numbers'
			},
			{
				field: 'day',
				message: 'Received date of submission day must be a real day'
			}
		],
		inline: 'Enter Received date of submission'
	},

	dayOnly: {
		summary: [
			{
				field: 'month',
				message: 'Received date of submission must include a month and year'
			}
		],
		inline: 'Received date of submission must include a month and year'
	},

	monthOnly: {
		summary: [
			{
				field: 'day',
				message: 'Received date of submission must include a day and year'
			}
		],
		inline: 'Received date of submission must include a day and year'
	},

	yearOnly: {
		summary: [
			{
				field: 'day',
				message: 'Received date of submission must include a day and month'
			}
		],
		inline: 'Received date of submission must include a day and month'
	},

	dayMonthOnly: {
		summary: [
			{
				field: 'year',
				message: 'Received date of submission must include a year'
			}
		],
		inline: 'Received date of submission must include a year'
	},

	dayYearOnly: {
		summary: [
			{
				field: 'month',
				message: 'Received date of submission must include a month'
			}
		],
		inline: 'Received date of submission must include a month'
	},

	monthYearOnly: {
		summary: [
			{
				field: 'day',
				message: 'Received date of submission must include a day'
			}
		],
		inline: 'Received date of submission must include a day'
	},

	invalidDay: {
		summary: [
			{
				field: 'day',
				message: 'Received date of submission day must be a real day'
			}
		],
		inline: 'Received date of submission day must be a real day'
	},

	invalidMonth: {
		summary: [
			{
				field: 'month',
				message: 'Received date of submission month must be between 1 and 12'
			}
		],
		inline: 'Received date of submission month must be between 1 and 12'
	},

	invalidYear: {
		summary: [
			{
				field: 'year',
				message: 'Received date of submission year must include 4 numbers'
			}
		],
		inline: 'Received date of submission year must include 4 numbers'
	}
};

export class DateUtility {
	private readonly page: Page;
	private readonly commonComponent: CommonComponent;

	constructor(page: Page) {
		this.page = page;
		this.commonComponent = new CommonComponent(page);
	}

	public readonly actions = {
		/**
		 * Enters a supplied date, or a generated random date.
		 */
		enterDate: async (date?: DateField): Promise<DateField> => {
			const valueToUse = date ?? generateRandomDate();

			const dayField = this.page.locator('#receivedDate_day');
			const monthField = this.page.locator('#receivedDate_month');
			const yearField = this.page.locator('#receivedDate_year');

			await expect(dayField, 'Day field should be visible before entering a value').toBeVisible();
			await dayField.fill(valueToUse.day);
			await expect(dayField).toHaveValue(valueToUse.day);

			await expect(monthField, 'Month field should be visible before entering a value').toBeVisible();
			await monthField.fill(valueToUse.month);
			await expect(monthField).toHaveValue(valueToUse.month);

			await expect(yearField, 'Year field should be visible before entering a value').toBeVisible();
			await yearField.fill(valueToUse.year);
			await expect(yearField).toHaveValue(valueToUse.year);

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

			const dayField = this.page.locator('#receivedDate_day');
			const monthField = this.page.locator('#receivedDate_month');
			const yearField = this.page.locator('#receivedDate_year');

			await expect(dayField, 'Day field should be visible before entering a value').toBeVisible();
			await dayField.fill(valueToUse.day);
			await expect(dayField).toHaveValue(valueToUse.day);

			await expect(monthField, 'Month field should be visible before entering a value').toBeVisible();
			await monthField.fill(valueToUse.month);
			await expect(monthField).toHaveValue(valueToUse.month);

			await expect(yearField, 'Year field should be visible before entering a value').toBeVisible();
			await yearField.fill(valueToUse.year);
			await expect(yearField).toHaveValue(valueToUse.year);

			return valueToUse;
		}
	};

	public readonly assertions = {
		/**
		 * Verifies the expected received date validation state.
		 * Checks summary errors and the inline date error when expected.
		 */
		hasDateErrorState: async (state: DateErrorState) => {
			const expected = dateErrorMap[state];

			await expect(
				this.page.locator('.govuk-error-summary__list li'),
				`Error summary should contain exactly ${expected.summary.length} error(s)`
			).toHaveCount(expected.summary.length);

			for (const item of expected.summary) {
				await this.commonComponent.assertions.verifyErrorSummary(item.message, {
					href: `#receivedDate_${item.field}`
				});
			}

			if (expected.inline !== undefined) {
				const inlineError = this.page.locator('#receivedDate-error');

				await expect(inlineError, 'Received date inline error should be visible').toBeVisible();
				await expect(inlineError).toContainText(expected.inline);
			}

			return this.assertions;
		},

		/**
		 * Verifies the received date fields contain the expected values.
		 */
		hasDateValue: async (date: DateField) => {
			await expect(this.page.locator('#receivedDate_day')).toHaveValue(date.day);
			await expect(this.page.locator('#receivedDate_month')).toHaveValue(date.month);
			await expect(this.page.locator('#receivedDate_year')).toHaveValue(date.year);

			return this.assertions;
		}
	};
}
