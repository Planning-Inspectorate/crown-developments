import { REPRESENTATION_CATEGORY_ID, REPRESENTATION_STATUS_ID } from '@pins/crowndev-database/src/seed/data-static.js';
import { wrapPrismaError } from '@pins/crowndev-lib/util/database.js';
import { dateFilter, parseDateFromParts } from './date-filters-validator.js';

const excludedFilterKeys = ['itemsPerPage', 'page', 'searchCriteria'];

/**
 * @typedef CheckboxFilter
 * @property {string} title
 * @property {'checkboxes'} type
 * @property {string} name
 * @property {{ items: { displayName: string, text: string, value: string, checked: boolean }[] }} options
 */

/**
 * Builds filter sections for representations based on database counts.
 * @param {import('#service').PortalService} service
 * @param {string} id
 * @param {{[key: string]: string | string[] }} queryFilters
 * @returns {Promise<(CheckboxFilter | DateFilter)[]>}
 */
export async function buildFilters({ db, logger }, id, queryFilters) {
	const interestedParties = REPRESENTATION_CATEGORY_ID.INTERESTED_PARTIES;
	const consultees = REPRESENTATION_CATEGORY_ID.CONSULTEES;
	try {
		const [interestedPartyCount, consulteeCount, withAttachmentsCount, withoutAttachmentsCount] = await Promise.all([
			db.representation.count({
				where: { categoryId: interestedParties, applicationId: id, statusId: REPRESENTATION_STATUS_ID.ACCEPTED }
			}),
			db.representation.count({
				where: { categoryId: consultees, applicationId: id, statusId: REPRESENTATION_STATUS_ID.ACCEPTED }
			}),
			db.representation.count({
				where: { containsAttachments: true, applicationId: id, statusId: REPRESENTATION_STATUS_ID.ACCEPTED }
			}),
			db.representation.count({
				where: { containsAttachments: false, applicationId: id, statusId: REPRESENTATION_STATUS_ID.ACCEPTED }
			})
		]);
		//normalize to array to allow for single values or arrays of values to remain open
		const normalizeToArray = (value) => [value].flat(1).filter((value) => value !== undefined);
		const submittedByArray = normalizeToArray(queryFilters?.filterSubmittedBy);
		const attachmentsArray = normalizeToArray(queryFilters?.filterByAttachments);

		const submittedBySection = {
			title: 'Submitted by',
			type: 'checkboxes',
			name: 'filterSubmittedBy',
			options: {
				items: [
					{
						displayName: 'Interested Party',
						text: `Interested party (${interestedPartyCount})`,
						value: interestedParties,
						checked: sanitiseQueryToStringArray(queryFilters?.filterSubmittedBy).includes(interestedParties) || false
					},
					{
						displayName: 'Consultee',
						text: `Consultee (${consulteeCount})`,
						value: consultees,
						checked: sanitiseQueryToStringArray(queryFilters?.filterSubmittedBy).includes(consultees) || false
					}
				]
			},
			open: submittedByArray.some(Boolean)
		};

		const attachmentsSection = {
			title: 'Contains attachments',
			name: 'filterByAttachments',
			type: 'checkboxes',
			options: {
				items: [
					{
						displayName: 'Yes',
						text: `Yes (${withAttachmentsCount})`,
						value: 'withAttachments',
						checked: sanitiseQueryToStringArray(queryFilters?.filterByAttachments).includes('withAttachments') || false
					},
					{
						displayName: 'No',
						text: `No (${withoutAttachmentsCount})`,
						value: 'withoutAttachments',
						checked:
							sanitiseQueryToStringArray(queryFilters?.filterByAttachments).includes('withoutAttachments') || false
					}
				]
			},
			open: attachmentsArray.some(Boolean)
		};

		queryFilters = queryFilters || {};
		const fromValues = {
			day: queryFilters['submittedDateFrom-day'],
			month: queryFilters['submittedDateFrom-month'],
			year: queryFilters['submittedDateFrom-year']
		};
		const toValues = {
			day: queryFilters['submittedDateTo-day'],
			month: queryFilters['submittedDateTo-month'],
			year: queryFilters['submittedDateTo-year']
		};
		const fromDate = parseDateFromParts(fromValues.day, fromValues.month, fromValues.year);
		const toDate = parseDateFromParts(toValues.day, toValues.month, toValues.year);
		const dateSubmissionsSection = {
			title: 'Submitted date',
			type: 'date-input',
			name: 'submittedDate',
			dateInputs: [
				Object.assign(
					dateFilter({
						id: 'submittedDateFrom',
						title: 'From',
						hint: { text: 'For example, 5 7 2022' },
						values: fromValues,
						compareDate: toDate,
						compareType: 'before'
					}),
					{ value: fromValues }
				),
				Object.assign(
					dateFilter({
						id: 'submittedDateTo',
						title: 'To',
						hint: { text: 'For example, 27 3 2023' },
						values: toValues,
						compareDate: fromDate,
						compareType: 'after'
					}),
					{ value: toValues }
				)
			],
			open: [fromValues, toValues].some((value) => value.day || value.month || value.year)
		};
		dateSubmissionsSection.hasErrors = !!dateSubmissionsSection.dateInputs.some((input) => input.errorMessage);

		return [submittedBySection, attachmentsSection, dateSubmissionsSection];
	} catch (error) {
		wrapPrismaError({
			error,
			logger,
			message: 'fetching written representations',
			logParams: { id }
		});
	}
}

/**
 * Determines if any meaningful query parameters are present, excluding pagination and search criteria.
 * @param {{[key: string]: string|string[]}} query
 * @returns {boolean}
 */
export function hasQueries(query) {
	return Object.entries(query || {})
		.filter(([key]) => !excludedFilterKeys.includes(key))
		.some(([, value]) =>
			Array.isArray(value) ? value.some((v) => v !== '' && v != null) : value !== '' && value != null
		);
}

/**
 * @typedef { {label: string, id: string, displayName: string, queryKeys?: string[]} } FilterQueryItem
 */

/**
 * Extracts selected filter items from the filters array.
 * @param {Filter[]} filters
 * @returns {FilterQueryItem[]}
 */
export function getFilterQueryItems(filters) {
	const filterQueryItems = [];
	filters.forEach((filter) => {
		if (filter.options?.items) {
			filter.options.items.forEach((item) => {
				if (item.checked) {
					filterQueryItems.push({ label: filter.title, id: item.value, displayName: item.displayName });
				}
			});
		}
		if (filter.dateInputs) {
			filter.dateInputs?.forEach((dateInput) => {
				const hasAllValues = dateInput.items?.every((item) => item.value);
				const hasNoError = !dateInput.errorMessage;
				if (hasAllValues && hasNoError) {
					const day = dateInput.items.find((item) => item.name === 'day')?.value;
					const month = dateInput.items.find((item) => item.name === 'month')?.value;
					const year = dateInput.items.find((item) => item.name === 'year')?.value;

					filterQueryItems.push({
						label: dateInput.title,
						id: dateInput.idPrefix,
						displayName: `${day.padStart(2, 0)}/${month.padStart(2, 0)}/${year}`,
						queryKeys: [`${dateInput.idPrefix}-day`, `${dateInput.idPrefix}-month`, `${dateInput.idPrefix}-year`]
					});
				}
			});
		}
	});
	return filterQueryItems;
}

/**
 * Maps an array of filter values to booleans based on specified true and false values.
 * @param {string[]} filters
 * @param {string} trueValue
 * @param {string} falseValue
 * @returns {boolean[]}
 */
export function mapWithAndWithoutToBoolean(filters, trueValue, falseValue) {
	return filters
		.map((value) => (value === trueValue ? true : value === falseValue ? false : null))
		.filter((value) => value !== null);
}

/**
 * Sanitises a query parameter into an array of strings.
 * @param {*} query
 * @returns {string[]|*|*[]}
 */
export function sanitiseQueryToStringArray(query) {
	const val = query;
	if (Array.isArray(val)) return val.filter((v) => typeof v === 'string' && v !== '');
	if (val == null || val === '') return [];
	if (typeof val === 'string') return [val];
	return [];
}
