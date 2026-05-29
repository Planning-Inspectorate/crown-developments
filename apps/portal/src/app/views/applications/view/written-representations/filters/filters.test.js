import { describe, it, beforeEach, mock } from 'node:test';
import assert from 'node:assert';
import { buildFilters, hasQueries, mapWithAndWithoutToBoolean } from './filters.ts';
import { REPRESENTATION_CATEGORY_ID } from '@pins/crowndev-database/src/seed/data-static.ts';
import { Prisma } from '@pins/crowndev-database/src/client/client.ts';
import { mockLogger } from '@pins/crowndev-lib/testing/mock-logger.js';

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

		it('should mark items as checked based on queryFilters', async () => {
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

	describe('hasQueries (representation-specific)', () => {
		it('returns false when only representation excluded keys present', () => {
			assert.strictEqual(hasQueries({ itemsPerPage: '25', page: '2', searchCriteria: 'test' }), false);
		});
		it('returns true when representation filter is present', () => {
			assert.strictEqual(hasQueries({ filterSubmittedBy: ['party'] }), true);
			assert.strictEqual(hasQueries({ filterByAttachments: ['withAttachments'] }), true);
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
