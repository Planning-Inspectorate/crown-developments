import { validateDate } from '@pins/crowndev-lib/validators/date-filter-validator.js';

export interface DateFilterItem {
	name: string;
	label: string;
	value?: string;
	classes?: string;
}

export interface DateFilterResult {
	fieldset: {
		legend: {
			text: string;
			classes: string;
		};
	};
	id: string;
	title: string;
	idPrefix: string;
	namePrefix: string;
	hint?: {
		text: string;
	};
	items: DateFilterItem[];
	value: Partial<{
		day: string;
		month: string;
		year: string;
	}>;
	errorMessage?: {
		text: string;
	};
}

export interface DateFilterOptions {
	title: string;
	id: string;
	hint?: {
		text: string;
	};
	values?: Partial<{
		day: string;
		month: string;
		year: string;
	}>;
	compareDate?: Date;
	compareType?: 'before' | 'after';
}

/**
 * Validates a date input and returns a structured date filter object
 */
export function dateFilter(options: DateFilterOptions): DateFilterResult {
	const { title, id, hint, values = {}, compareDate, compareType } = options;
	let day = values.day;
	let month = values.month;
	let year = values.year;

	// Normalize possible array values from untrusted input to strings or undefined.
	day = typeof day === 'string' ? day : undefined;
	month = typeof month === 'string' ? month : undefined;
	year = typeof year === 'string' ? year : undefined;

	const errorMessage = validateDate(day, month, year, title, compareDate, compareType);

	return {
		fieldset: { legend: { text: title, classes: 'govuk-fieldset__legend--s' } },
		title,
		id: id,
		idPrefix: id,
		namePrefix: id,
		hint,
		items: [
			{
				classes: 'govuk-input--width-2',
				name: `day`,
				label: 'Day',
				value: day
			},
			{
				classes: 'govuk-input--width-2',
				name: `month`,
				label: 'Month',
				value: month
			},
			{
				classes: 'govuk-input--width-4',
				name: `year`,
				label: 'Year',
				value: year
			}
		],
		value: { day, month, year },
		...(errorMessage && { errorMessage })
	};
}
