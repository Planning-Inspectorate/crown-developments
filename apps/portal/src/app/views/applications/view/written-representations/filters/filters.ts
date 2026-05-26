import { REPRESENTATION_CATEGORY_ID, REPRESENTATION_STATUS_ID } from '@pins/crowndev-database/src/seed/data-static.ts';
import { wrapPrismaError } from '@pins/crowndev-lib/util/database.js';
import { dateFilter } from '../../filters/date-filter.ts';
import { parseDateFromParts } from '@pins/crowndev-lib/validators/date-filter-validator.js';
import type { PortalService } from '#service';

const excludedFilterKeys = ['itemsPerPage', 'page', 'searchCriteria'] as const;

/**
 * Represents a checkbox filter section (like "Submitted by" or "Contains attachments")
 */
interface CheckboxFilter {
	title: string;
	type: 'checkboxes';
	name: string;
	options: {
		items: Array<{
			displayName: string;
			text: string;
			value: string;
			checked: boolean;
		}>;
	};
	open?: boolean;
}

/**
 * Represents a date filter section (like "Date submitted")
 */
interface DateFilter {
	title: string;
	type: 'date-input';
	name: string;
	dateInputs: Array<{
		fieldset: { legend: { text: string; classes: string } };
		title: string;
		id: string;
		idPrefix: string;
		namePrefix: string;
		hint?: { text: string };
		items: Array<{ name: string; label: string; value?: string; classes?: string }>;
		value: Partial<{ day: string; month: string; year: string }>; // Partial makes all properties optional
		errorMessage?: { text: string };
	}>;
	open?: boolean;
	hasErrors?: boolean;
}

type FilterSection = CheckboxFilter | DateFilter;

interface FilterQueryItem {
	label: string;
	id: string;
	displayName: string;
	queryKeys?: string[];
}

type QueryFilters = Record<string, string | string[] | undefined>;

export async function buildFilters(
	{ db, logger }: Pick<PortalService, 'db' | 'logger'>,
	id: string,
	queryFilters: QueryFilters
): Promise<FilterSection[] | undefined> {
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

		const normalizeToArray = (value: unknown): string[] =>
			[value].flat(1).filter((v): v is string => typeof v === 'string' && v !== undefined);

		const submittedByArray = normalizeToArray(queryFilters?.filterSubmittedBy);
		const attachmentsArray = normalizeToArray(queryFilters?.filterByAttachments);

		const submittedBySection: CheckboxFilter = {
			title: 'Submitted by',
			type: 'checkboxes' as const, // ← Literal type assertion
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

		const attachmentsSection: CheckboxFilter = {
			title: 'Contains attachments',
			name: 'filterByAttachments',
			type: 'checkboxes' as const,
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
			day:
				typeof queryFilters['submittedDateFrom-day'] === 'string' ? queryFilters['submittedDateFrom-day'] : undefined,
			month:
				typeof queryFilters['submittedDateFrom-month'] === 'string'
					? queryFilters['submittedDateFrom-month']
					: undefined,
			year:
				typeof queryFilters['submittedDateFrom-year'] === 'string' ? queryFilters['submittedDateFrom-year'] : undefined
		};
		const toValues = {
			day: typeof queryFilters['submittedDateTo-day'] === 'string' ? queryFilters['submittedDateTo-day'] : undefined,
			month:
				typeof queryFilters['submittedDateTo-month'] === 'string' ? queryFilters['submittedDateTo-month'] : undefined,
			year: typeof queryFilters['submittedDateTo-year'] === 'string' ? queryFilters['submittedDateTo-year'] : undefined
		};

		const fromDate =
			parseDateFromParts(fromValues.day ?? '', fromValues.month ?? '', fromValues.year ?? '') ?? undefined;
		const toDate = parseDateFromParts(toValues.day ?? '', toValues.month ?? '', toValues.year ?? '') ?? undefined;

		const dateSubmissionsSection: DateFilter = {
			title: 'Date submitted',
			type: 'date-input' as const,
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

		dateSubmissionsSection.hasErrors = dateSubmissionsSection.dateInputs.some((input) => input.errorMessage);

		return [submittedBySection, attachmentsSection, dateSubmissionsSection];
	} catch (error) {
		wrapPrismaError({
			error,
			logger,
			message: 'fetching written representations',
			logParams: { id }
		});
		return undefined;
	}
}

export function hasQueries(query: QueryFilters): boolean {
	return Object.entries(query || {})
		.filter(([key]) => !excludedFilterKeys.includes(key as (typeof excludedFilterKeys)[number]))
		.some(([, value]) =>
			Array.isArray(value) ? value.some((v) => v !== '' && v != null) : value !== '' && value != null
		);
}

export function getFilterQueryItems(filters: FilterSection[]): FilterQueryItem[] {
	const filterQueryItems: FilterQueryItem[] = [];

	filters.forEach((filter) => {
		if ('options' in filter && filter.options?.items) {
			filter.options.items.forEach((item) => {
				if (item.checked) {
					filterQueryItems.push({ label: filter.title, id: item.value, displayName: item.displayName });
				}
			});
		}

		if ('dateInputs' in filter && filter.dateInputs) {
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
						displayName: `${day?.padStart(2, '0')}/${month?.padStart(2, '0')}/${year}`,
						queryKeys: [`${dateInput.idPrefix}-day`, `${dateInput.idPrefix}-month`, `${dateInput.idPrefix}-year`]
					});
				}
			});
		}
	});
	return filterQueryItems;
}

export function mapWithAndWithoutToBoolean(filters: string[], trueValue: string, falseValue: string): boolean[] {
	return filters
		.map((value) => (value === trueValue ? true : value === falseValue ? false : null))
		.filter((value): value is boolean => value !== null);
}

export function sanitiseQueryToStringArray(query: unknown): string[] {
	const val = query;
	if (Array.isArray(val)) return val.filter((v): v is string => typeof v === 'string' && v !== '');
	if (val == null || val === '') return [];
	if (typeof val === 'string') return [val];
	return [];
}
