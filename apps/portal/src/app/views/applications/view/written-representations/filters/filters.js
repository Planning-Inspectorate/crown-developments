import { REPRESENTATION_CATEGORY_ID, REPRESENTATION_STATUS_ID } from '@pins/crowndev-database/src/seed/data-static.js';
import { wrapPrismaError } from '@pins/crowndev-lib/util/database.js';

const excludedFilterKeys = ['itemsPerPage', 'page', 'searchCriteria'];
/**
 * @typedef {displayName: string, text: string, value: string, checked: boolean} FilterItem
 * @typedef {{title: string, type: string, name: string, options: {items: FilterItem[]}}} Filter
 */

/**
 * Builds filter sections for representations based on database counts.
 * @param {import('#service').PortalService} service
 * @param {string} id
 * @param {{[key: string]: string | string[] }} queryFilters
 * @returns {Promise<Filter[]> | Promise<void>}
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
						checked: queryFilters?.filterSubmittedBy?.includes(interestedParties) || false
					},
					{
						displayName: 'Consultee',
						text: `Consultee (${consulteeCount})`,
						value: consultees,
						checked: queryFilters?.filterSubmittedBy?.includes(consultees) || false
					}
				]
			}
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
						checked: queryFilters?.filterByAttachments?.includes('withAttachments') || false
					},
					{
						displayName: 'No',
						text: `No (${withoutAttachmentsCount})`,
						value: 'withoutAttachments',
						checked: queryFilters?.filterByAttachments?.includes('withoutAttachments') || false
					}
				]
			}
		};

		return [submittedBySection, attachmentsSection];
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
 * @typedef { {label: string, id: string, displayName: string}} FilterQueryItem
 */

/**
 * Extracts selected filter items from the filters array.
 * @param {Filter[]} filters
 * @returns {FilterQueryItem[]}
 */
export function getFilterQueryItems(filters) {
	const filterQueryItems = [];
	filters.forEach((filter) => {
		const {
			title,
			options: { items }
		} = filter;
		items.forEach((item) => {
			if (item.checked) {
				filterQueryItems.push({ label: title, id: item.value, displayName: item.displayName });
			}
		});
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
