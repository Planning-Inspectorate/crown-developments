import { validateDate } from '@pins/crowndev-lib/validators/date-filter-validator.js';

/**
 * @typedef {Object} DateFilter
 * @property {{ legend: { text: string, classes: string } }} fieldset
 * @property {string} id
 * @property {string} title
 * @property {string} idPrefix
 * @property {string} namePrefix
 * @property {{ text: string }} [hint]
 * @property {Array<{ name: string, label: string, value?: string, classes?: string }>} items
 * @property {Partial<{ day: string, month: string, year: string }>} value
 * @property {{ text: string }} [errorMessage]
 */

/**
 * Validates a date input
 * @param {object} options
 * @param {Partial<{ day: string, month: string, year: string }>} options.values
 * @param {string} options.title
 * @param {string} options.id
 * @param {{ text: string }} [options.hint]
 * @param {Date} [options.compareDate]
 * @param {'before' | 'after'} [options.compareType]
 * @returns {DateFilter}
 */
export function dateFilter({ title, id, hint, values = {}, compareDate, compareType }) {
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
