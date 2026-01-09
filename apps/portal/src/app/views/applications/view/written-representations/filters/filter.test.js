import { describe, it, beforeEach, mock } from 'node:test';
import assert from 'node:assert';
import {
	buildFilters,
	hasQueries,
	getFilterQueryItems,
	mapWithAndWithoutToBoolean,
	sanitiseQueryToStringArray
} from './filters.js';
import { REPRESENTATION_CATEGORY_ID } from '@pins/crowndev-database/src/seed/data-static.js';
import { Prisma } from '@pins/crowndev-database/src/client/client.js';
import { mockLogger } from '@pins/crowndev-lib/testing/mock-logger.js';
import { dateFilter, parseDateFromParts } from './date-filters-validator.js';

// Helper to create a mock db with overridable count behaviour
function createMockDb(counts) {
	return {
		representation: {
			count: mock.fn((args) => {
				// Decide which count to return based on args.where
				if (args?.where?.categoryId === REPRESENTATION_CATEGORY_ID.INTERESTED_PARTIES) {
					return counts.interestedPartyCount;
				}
				if (args?.where?.categoryId === REPRESENTATION_CATEGORY_ID.CONSULTEES) {
					return counts.consulteeCount;
				}
				if (typeof args?.where?.containsAttachments === 'boolean') {
					return args.where.containsAttachments ? counts.withAttachmentsCount : counts.withoutAttachmentsCount;
				}
				return 0;
			})
		}
	};
}

describe('Filters', () => {
	describe('buildFilters', () => {
		let logger;
		beforeEach(() => {
			logger = mockLogger();
		});

		it('should builds filter sections with counts and unchecked items when no queryFilters', async () => {
			const mockDb = createMockDb({
				interestedPartyCount: 3,
				consulteeCount: 5,
				withAttachmentsCount: 7,
				withoutAttachmentsCount: 11
			});
			const sections = await buildFilters({ db: mockDb, logger }, 'app-123', {});
			assert.ok(Array.isArray(sections));
			assert.strictEqual(sections.length, 3);

			const submittedBy = sections[0];
			assert.strictEqual(submittedBy.title, 'Submitted by');
			assert.strictEqual(submittedBy.type, 'checkboxes');
			assert.strictEqual(submittedBy.options.items.length, 2);
			assert.match(submittedBy.options.items[0].text, /Interested party \(3\)/);
			assert.match(submittedBy.options.items[1].text, /Consultee \(5\)/);
			assert.strictEqual(submittedBy.options.items[0].checked, false);
			assert.strictEqual(submittedBy.options.items[1].checked, false);

			const attachments = sections[1];
			assert.strictEqual(attachments.title, 'Contains attachments');
			assert.strictEqual(attachments.type, 'checkboxes');
			assert.strictEqual(attachments.options.items.length, 2);
			assert.match(attachments.options.items[0].text, /Yes \(7\)/);
			assert.match(attachments.options.items[1].text, /No \(11\)/);
			assert.strictEqual(attachments.options.items[0].checked, false);
			assert.strictEqual(attachments.options.items[1].checked, false);
		});

		it('should mark items as checked based on queryFilters arrays', async () => {
			const mockDb = createMockDb({
				interestedPartyCount: 1,
				consulteeCount: 2,
				withAttachmentsCount: 3,
				withoutAttachmentsCount: 4
			});
			const queryFilters = {
				filterSubmittedBy: [REPRESENTATION_CATEGORY_ID.INTERESTED_PARTIES, REPRESENTATION_CATEGORY_ID.CONSULTEES],
				filterByAttachments: ['withAttachments']
			};
			const sections = await buildFilters({ db: mockDb, logger }, 'app-123', queryFilters);
			const submittedByItems = sections[0].options.items;
			assert.strictEqual(submittedByItems[0].checked, true);
			assert.strictEqual(submittedByItems[1].checked, true);

			const attachmentsItems = sections[1].options.items;
			assert.strictEqual(attachmentsItems[0].checked, true);
			assert.strictEqual(attachmentsItems[1].checked, false);
		});

		it('should support both attachment options checked', async () => {
			const mockDb = createMockDb({
				interestedPartyCount: 0,
				consulteeCount: 0,
				withAttachmentsCount: 10,
				withoutAttachmentsCount: 20
			});
			const queryFilters = {
				filterByAttachments: ['withAttachments', 'withoutAttachments']
			};
			const sections = await buildFilters({ db: mockDb, logger }, 'app-123', queryFilters);
			const attachmentsItems = sections[1].options.items;
			assert.strictEqual(attachmentsItems[0].checked, true);
			assert.strictEqual(attachmentsItems[1].checked, true);
		});

		it('should return undefined on error and does not throw', async () => {
			const mockDb = {
				representation: {
					count: mock.fn(() => {
						throw new Prisma.PrismaClientValidationError('some error', { code: '101' });
					})
				}
			};
			await assert.rejects(() => buildFilters({ db: mockDb, logger }, 'app-123', {}), {
				message: 'Error fetching written representations (PrismaClientValidationError)'
			});
		});
	});

	describe('hasQueries', () => {
		it('returns false for empty object', () => {
			assert.strictEqual(hasQueries({}), false);
		});
		it('returns false when only excluded keys present', () => {
			assert.strictEqual(hasQueries({ itemsPerPage: '25', page: '2', searchCriteria: 'test' }), false);
		});
		it('returns false when filter arrays only contain empty values', () => {
			assert.strictEqual(hasQueries({ filterSubmittedBy: [''] }), false);
			assert.strictEqual(hasQueries({ filterSubmittedBy: ['', null] }), false);
		});
		it('returns true when at least one non-empty value exists', () => {
			assert.strictEqual(hasQueries({ filterSubmittedBy: ['party'] }), true);
			assert.strictEqual(hasQueries({ filterByAttachments: ['withAttachments'] }), true);
		});
		it('returns true for mixed array values with one non-empty', () => {
			assert.strictEqual(hasQueries({ filterSubmittedBy: ['', 'value'] }), true);
		});
		it('returns false for null/undefined query', () => {
			assert.strictEqual(hasQueries(undefined), false);
		});
	});

	describe('getFilterQueryItems', () => {
		it('extracts checked items from filters', () => {
			const filters = [
				{
					title: 'Submitted by',
					type: 'checkboxes',
					name: 'filterSubmittedBy',
					options: {
						items: [
							{ displayName: 'Interested Party', text: 'Interested (3)', value: 'a', checked: true },
							{ displayName: 'Consultee', text: 'Consultee (5)', value: 'b', checked: false }
						]
					}
				},
				{
					title: 'Contains attachments',
					type: 'checkboxes',
					name: 'filterByAttachments',
					options: {
						items: [
							{ displayName: 'Yes', text: 'Yes (7)', value: 'withAttachments', checked: true },
							{ displayName: 'No', text: 'No (11)', value: 'withoutAttachments', checked: true }
						]
					}
				},
				{
					title: 'Submitted date',
					type: 'date-input',
					name: 'submittedDate',
					dateInputs: [
						{
							idPrefix: 'submittedDateFrom',
							title: 'From',
							items: [
								{ id: 'day', value: '01' },
								{ id: 'month', value: '02' },
								{ id: 'year', value: '2025' }
							]
						},
						{
							idPrefix: 'submittedDateTo',
							title: 'To',
							items: [
								{ id: 'day', value: '10' },
								{ id: 'month', value: '02' },
								{ id: 'year', value: '2025' }
							]
						}
					]
				}
			];
			const itemsMacro = getFilterQueryItems(filters);

			assert.deepStrictEqual(itemsMacro, [
				{ label: 'Submitted by', id: 'a', displayName: 'Interested Party' },
				{ label: 'Contains attachments', id: 'withAttachments', displayName: 'Yes' },
				{ label: 'Contains attachments', id: 'withoutAttachments', displayName: 'No' },
				{
					label: 'From',
					id: 'submittedDateFrom',
					displayName: '01/02/2025',
					queryKeys: ['submittedDateFrom-day', 'submittedDateFrom-month', 'submittedDateFrom-year']
				},
				{
					label: 'To',
					id: 'submittedDateTo',
					displayName: '10/02/2025',
					queryKeys: ['submittedDateTo-day', 'submittedDateTo-month', 'submittedDateTo-year']
				}
			]);
		});
		it('returns empty array when no items checked', () => {
			const filters = [
				{
					title: 'Submitted by',
					type: 'checkboxes',
					name: 'filterSubmittedBy',
					options: { items: [{ displayName: 'Interested Party', text: 'Interested (0)', value: 'a', checked: false }] }
				}
			];
			assert.deepStrictEqual(getFilterQueryItems(filters), []);
		});
	});

	describe('mapWithAndWithoutToBoolean', () => {
		it('maps recognised values to booleans', () => {
			assert.deepStrictEqual(
				mapWithAndWithoutToBoolean(['withAttachments', 'withoutAttachments'], 'withAttachments', 'withoutAttachments'),
				[true, false]
			);
		});
		it('ignores unknown values', () => {
			assert.deepStrictEqual(
				mapWithAndWithoutToBoolean(['foo', 'withAttachments'], 'withAttachments', 'withoutAttachments'),
				[true]
			);
		});
		it('returns empty array for empty input', () => {
			assert.deepStrictEqual(mapWithAndWithoutToBoolean([], 'withAttachments', 'withoutAttachments'), []);
		});
		it('returns boolean array length matching recognised inputs only', () => {
			assert.deepStrictEqual(
				mapWithAndWithoutToBoolean(
					['withAttachments', 'bar', 'baz', 'withoutAttachments'],
					'withAttachments',
					'withoutAttachments'
				),
				[true, false]
			);
		});
	});

	describe('dateFilter range validation', () => {
		it('should not error for valid from/to range', () => {
			const toDate = parseDateFromParts(2, 11, 2025);
			const result = dateFilter({
				id: 'submittedDateFrom',
				title: 'From',
				values: { day: '1', month: '11', year: '2025' },
				compareDate: toDate,
				compareType: 'before'
			});
			assert.strictEqual(result.errorMessage, undefined);
		});

		it('should error if from date is after to date', () => {
			const toDate = parseDateFromParts(2, 11, 2025);
			const result = dateFilter({
				id: 'submittedDateFrom',
				title: 'From',
				values: { day: '4', month: '11', year: '2025' },
				compareDate: toDate,
				compareType: 'before'
			});
			assert.notStrictEqual(result.errorMessage, undefined);
			assert.match(result.errorMessage.text, /before the entered To date/);
		});

		it('should not error for same from/to date', () => {
			const toDate = parseDateFromParts(2, 11, 2025);
			const result = dateFilter({
				id: 'submittedDateFrom',
				title: 'From',
				values: { day: '2', month: '11', year: '2025' },
				compareDate: toDate,
				compareType: 'before'
			});
			assert.strictEqual(result.errorMessage, undefined);
		});

		it('should error for incomplete date', () => {
			const result = dateFilter({
				id: 'submittedDateFrom',
				title: 'From',
				values: { day: '', month: '11', year: '2025' }
			});
			assert.notStrictEqual(result.errorMessage, undefined);
			assert.match(result.errorMessage.text, /must include a day/i);
		});

		it('should error for invalid date', () => {
			const result = dateFilter({
				id: 'submittedDateFrom',
				title: 'From',
				values: { day: '31', month: '2', year: '2025' }
			});
			assert.notStrictEqual(result.errorMessage, undefined);
			assert.match(result.errorMessage.text, /day must be a real day/i);
		});

		it('should error for invalid month in date', () => {
			const result = dateFilter({
				id: 'submittedDateFrom',
				title: 'From',
				values: { day: '1', month: '13', year: '2025' }
			});
			assert.notStrictEqual(result.errorMessage, undefined);
			assert.match(result.errorMessage.text, /month must be a real month/i);
		});

		it('should error if to date is before from date', () => {
			const fromDate = parseDateFromParts(4, 11, 2025);
			const result = dateFilter({
				id: 'submittedDateTo',
				title: 'To',
				values: { day: '2', month: '11', year: '2025' },
				compareDate: fromDate,
				compareType: 'after'
			});
			assert.notStrictEqual(result.errorMessage, undefined);
			assert.match(result.errorMessage.text, /after the entered From date/);
		});
	});

	describe('buildFilters open property', () => {
		const mockDb = createMockDb({
			interestedPartyCount: 1,
			consulteeCount: 2,
			withAttachmentsCount: 3,
			withoutAttachmentsCount: 4
		});
		const logger = mockLogger();
		const appId = 'app-123';

		const cases = [
			['submittedBy: array value', { filterSubmittedBy: [REPRESENTATION_CATEGORY_ID.INTERESTED_PARTIES] }, 0, true],
			['submittedBy: string value', { filterSubmittedBy: REPRESENTATION_CATEGORY_ID.INTERESTED_PARTIES }, 0, true],
			['submittedBy: empty', {}, 0, false],
			['attachments: array value', { filterByAttachments: ['withAttachments'] }, 1, true],
			['attachments: string value', { filterByAttachments: 'withAttachments' }, 1, true],
			['attachments: empty', {}, 1, false],
			['date: from-year filled', { 'submittedDateFrom-year': '2025' }, 2, true],
			['date: all empty', {}, 2, false],
			['date: to-day filled', { 'submittedDateTo-day': '1' }, 2, true]
		];

		cases.forEach(([desc, query, idx, expected]) => {
			it(`open is ${expected} for ${desc}`, async () => {
				const filters = await buildFilters({ db: mockDb, logger }, appId, query);
				assert.strictEqual(filters[idx].open, expected);
			});
		});

		it('open is true for all filters when all are set', async () => {
			const filters = await buildFilters({ db: mockDb, logger }, appId, {
				filterSubmittedBy: [REPRESENTATION_CATEGORY_ID.INTERESTED_PARTIES],
				filterByAttachments: ['withAttachments'],
				'submittedDateFrom-day': '1',
				'submittedDateFrom-month': '1',
				'submittedDateFrom-year': '2025'
			});
			assert.strictEqual(filters[0].open, true);
			assert.strictEqual(filters[1].open, true);
			assert.strictEqual(filters[2].open, true);
		});
	});
});

describe('sanitisedQuery', () => {
	it('returns empty array for null, undefined, or empty string', () => {
		assert.deepStrictEqual(sanitiseQueryToStringArray(null), []);
		assert.deepStrictEqual(sanitiseQueryToStringArray(undefined), []);
		assert.deepStrictEqual(sanitiseQueryToStringArray(''), []);
	});

	it('wraps a string in an array', () => {
		assert.deepStrictEqual(sanitiseQueryToStringArray('foo'), ['foo']);
	});

	it('filters non-string values from arrays', () => {
		assert.deepStrictEqual(sanitiseQueryToStringArray(['foo', '', 123, null, undefined, {}, [], 'bar']), [
			'foo',
			'bar'
		]);
	});

	it('returns empty array for objects, numbers, booleans', () => {
		assert.deepStrictEqual(sanitiseQueryToStringArray({ a: 1 }), []);
		assert.deepStrictEqual(sanitiseQueryToStringArray(123), []);
		assert.deepStrictEqual(sanitiseQueryToStringArray(true), []);
		assert.deepStrictEqual(sanitiseQueryToStringArray(false), []);
	});

	it('returns empty array for function and symbol', () => {
		assert.deepStrictEqual(
			sanitiseQueryToStringArray(() => {}),
			[]
		);
		assert.deepStrictEqual(sanitiseQueryToStringArray(Symbol('x')), []);
	});

	it('returns empty array for array of only non-strings', () => {
		assert.deepStrictEqual(sanitiseQueryToStringArray([1, 2, null, undefined, {}, []]), []);
	});

	it('returns array of strings for array of strings', () => {
		assert.deepStrictEqual(sanitiseQueryToStringArray(['a', 'b', 'c']), ['a', 'b', 'c']);
	});
});
