import { describe, it, mock } from 'node:test';
import assert from 'node:assert';
import type { Request } from 'express';
import type { S62APortalService } from '#service';
import {
	LPA_PARAM,
	buildActiveFilterTags,
	buildLpaFilterItems,
	buildLpaFilterSections,
	getLpaOptions,
	getSelectedLpaIds
} from './filters.ts';
import type { LpaOption } from './filters.ts';

/** Query objects in tests are plain objects, Express types them as ParsedQs */
const query = (q: Record<string, unknown> | undefined) => q as unknown as Request['query'];

const BRISTOL_ID = '1a76f67e-5828-4532-bd6f-aa7ef40a13ca';
const ST_ALBANS_ID = '8dbf5dd6-db68-4273-9ed4-d4fbf3011a21';

const options: LpaOption[] = [
	{ id: BRISTOL_ID.toUpperCase(), name: 'Bristol City Council', count: 3 },
	{ id: ST_ALBANS_ID.toUpperCase(), name: 'St Albans City and District Council', count: 2 }
];

describe('list filters', () => {
	describe('LPA_PARAM', () => {
		it('should be lpa', () => {
			assert.strictEqual(LPA_PARAM, 'lpa');
		});
	});

	describe('getLpaOptions', () => {
		function dbReturning(rows: unknown[]) {
			const findMany = mock.fn((_args: unknown) => rows);
			const db = { lpa: { findMany } } as unknown as S62APortalService['db'];
			return { db, findMany };
		}

		it('should return each LPA with primary and secondary counts added together', async () => {
			const { db } = dbReturning([
				{ id: 'a', name: 'Alpha Council', _count: { S62aCases: 2, SecondaryS62aCases: 1 } },
				{ id: 'b', name: 'Beta Council', _count: { S62aCases: 0, SecondaryS62aCases: 4 } }
			]);

			const result = await getLpaOptions(db, new Date('2026-01-01T00:00:00.000Z'));

			assert.deepStrictEqual(result, [
				{ id: 'a', name: 'Alpha Council', count: 3 },
				{ id: 'b', name: 'Beta Council', count: 4 }
			]);
		});

		it('should return an empty array when there are no published LPAs', async () => {
			const { db } = dbReturning([]);
			assert.deepStrictEqual(await getLpaOptions(db, new Date()), []);
		});

		it('should only include LPAs on published cases, as primary or secondary', async () => {
			const now = new Date('2026-01-01T00:00:00.000Z');
			const { db, findMany } = dbReturning([]);

			await getLpaOptions(db, now);

			const args = findMany.mock.calls[0].arguments[0] as any;
			const published = {
				S62aDates: { publishDate: { lte: now } },
				OR: [{ publishedToLegacyGovUk: false }, { publishedToLegacyGovUk: null }]
			};
			assert.deepStrictEqual(args.where, {
				OR: [{ S62aCases: { some: published } }, { SecondaryS62aCases: { some: published } }]
			});
		});

		it('should count only published cases', async () => {
			const now = new Date('2026-01-01T00:00:00.000Z');
			const { db, findMany } = dbReturning([]);

			await getLpaOptions(db, now);

			const args = findMany.mock.calls[0].arguments[0] as any;
			const published = {
				S62aDates: { publishDate: { lte: now } },
				OR: [{ publishedToLegacyGovUk: false }, { publishedToLegacyGovUk: null }]
			};
			assert.deepStrictEqual(args.select._count.select, {
				S62aCases: { where: published },
				SecondaryS62aCases: { where: published }
			});
		});

		it('should sort by name', async () => {
			const { db, findMany } = dbReturning([]);

			await getLpaOptions(db, new Date());

			assert.deepStrictEqual((findMany.mock.calls[0].arguments[0] as any).orderBy, { name: 'asc' });
		});

		it('should not take search or filter into account, so counts stay the same', async () => {
			const { db, findMany } = dbReturning([]);

			await getLpaOptions(db, new Date());

			// the function has no search or filter input, and the query has no lpa or search clauses
			const where = JSON.stringify((findMany.mock.calls[0].arguments[0] as any).where);
			assert.ok(!where.includes('contains'));
			assert.ok(!where.includes('"in"'));
		});
	});

	describe('getSelectedLpaIds', () => {
		it('should return an empty array when there is no query', () => {
			assert.deepStrictEqual(getSelectedLpaIds(query(undefined), options), []);
		});

		it('should return an empty array when the lpa param is missing', () => {
			assert.deepStrictEqual(getSelectedLpaIds(query({ other: 'x' }), options), []);
		});

		it('should return a single selected id', () => {
			assert.deepStrictEqual(getSelectedLpaIds(query({ lpa: BRISTOL_ID }), options), [BRISTOL_ID]);
		});

		it('should return several selected ids in the order requested', () => {
			const result = getSelectedLpaIds(query({ lpa: [ST_ALBANS_ID, BRISTOL_ID] }), options);
			assert.deepStrictEqual(result, [ST_ALBANS_ID, BRISTOL_ID]);
		});

		it('should match ids case-insensitively and return them lower-cased', () => {
			assert.deepStrictEqual(getSelectedLpaIds(query({ lpa: BRISTOL_ID.toUpperCase() }), options), [BRISTOL_ID]);
		});

		it('should drop ids that are not a published LPA', () => {
			const unknown = 'ffffffff-ffff-ffff-ffff-ffffffffffff';
			assert.deepStrictEqual(getSelectedLpaIds(query({ lpa: [BRISTOL_ID, unknown] }), options), [BRISTOL_ID]);
		});

		it('should drop malformed ids so they never reach the database', () => {
			assert.deepStrictEqual(getSelectedLpaIds(query({ lpa: 'not-a-guid' }), options), []);
		});

		it('should de-duplicate repeated ids, including differently cased ones', () => {
			const result = getSelectedLpaIds(query({ lpa: [BRISTOL_ID, BRISTOL_ID.toUpperCase(), BRISTOL_ID] }), options);
			assert.deepStrictEqual(result, [BRISTOL_ID]);
		});

		it('should ignore empty strings', () => {
			assert.deepStrictEqual(getSelectedLpaIds(query({ lpa: ['', BRISTOL_ID] }), options), [BRISTOL_ID]);
		});

		it('should ignore nested objects, e.g. ?lpa[a]=b', () => {
			assert.deepStrictEqual(getSelectedLpaIds(query({ lpa: { a: BRISTOL_ID } }), options), []);
		});

		it('should ignore non-string values inside an array', () => {
			assert.deepStrictEqual(getSelectedLpaIds(query({ lpa: [{ a: 'b' }, BRISTOL_ID] }), options), [BRISTOL_ID]);
		});

		it('should return nothing when there are no options', () => {
			assert.deepStrictEqual(getSelectedLpaIds(query({ lpa: BRISTOL_ID }), []), []);
		});
	});

	describe('buildLpaFilterItems', () => {
		it('should return an empty array when there are no options', () => {
			assert.deepStrictEqual(buildLpaFilterItems([], []), []);
		});

		it('should show each option as "name (count)" with the original id as the value', () => {
			const result = buildLpaFilterItems(options, []);

			assert.deepStrictEqual(result, [
				{ value: BRISTOL_ID.toUpperCase(), text: 'Bristol City Council (3)', checked: false },
				{ value: ST_ALBANS_ID.toUpperCase(), text: 'St Albans City and District Council (2)', checked: false }
			]);
		});

		it('should tick the selected options only', () => {
			const result = buildLpaFilterItems(options, [ST_ALBANS_ID]);

			assert.deepStrictEqual(
				result.map((item) => item.checked),
				[false, true]
			);
		});

		it('should tick options even though the stored ids are upper case and selections are lower case', () => {
			const result = buildLpaFilterItems(options, [BRISTOL_ID, ST_ALBANS_ID]);

			assert.ok(result.every((item) => item.checked));
		});

		it('should keep the option order', () => {
			const result = buildLpaFilterItems(options, []);

			assert.deepStrictEqual(
				result.map((item) => item.text),
				['Bristol City Council (3)', 'St Albans City and District Council (2)']
			);
		});

		it('should show a count of zero rather than hiding it', () => {
			const result = buildLpaFilterItems([{ id: 'x', name: 'Empty Council', count: 0 }], []);

			assert.strictEqual(result[0].text, 'Empty Council (0)');
		});
	});

	describe('buildActiveFilterTags', () => {
		it('should return no tags when nothing is selected', () => {
			assert.deepStrictEqual(buildActiveFilterTags(options, [], '/applications', query({})), []);
		});

		it('should return one tag per selected LPA, using the display name', () => {
			const result = buildActiveFilterTags(
				options,
				[BRISTOL_ID, ST_ALBANS_ID],
				'/applications',
				query({ lpa: [BRISTOL_ID, ST_ALBANS_ID] })
			);

			assert.deepStrictEqual(
				result.map((tag) => tag.name),
				['Bristol City Council', 'St Albans City and District Council']
			);
			assert.ok(result.every((tag) => tag.label === 'Local planning authority'));
		});

		it('should not return tags for LPAs that are not selected', () => {
			const result = buildActiveFilterTags(options, [BRISTOL_ID], '/applications', query({ lpa: BRISTOL_ID }));

			assert.strictEqual(result.length, 1);
			assert.strictEqual(result[0].name, 'Bristol City Council');
		});

		it('should link to the URL with no LPA params when the only LPA is removed', () => {
			const [tag] = buildActiveFilterTags(options, [BRISTOL_ID], '/applications', query({ lpa: BRISTOL_ID }));

			assert.strictEqual(tag.removeUrl, '/applications');
		});

		it('should remove only that LPA and keep the others', () => {
			const result = buildActiveFilterTags(
				options,
				[BRISTOL_ID, ST_ALBANS_ID],
				'/applications',
				query({ lpa: [BRISTOL_ID, ST_ALBANS_ID] })
			);

			const bristol = result.find((tag) => tag.name === 'Bristol City Council');
			const stAlbans = result.find((tag) => tag.name === 'St Albans City and District Council');
			assert.strictEqual(bristol?.removeUrl, `/applications?lpa=${ST_ALBANS_ID}`);
			assert.strictEqual(stAlbans?.removeUrl, `/applications?lpa=${BRISTOL_ID}`);
		});

		it('should keep the search term and items per page when a tag is removed', () => {
			const [tag] = buildActiveFilterTags(
				options,
				[BRISTOL_ID],
				'/applications',
				query({ searchCriteria: 'smith', itemsPerPage: '50', lpa: BRISTOL_ID })
			);

			assert.strictEqual(tag.removeUrl, '/applications?searchCriteria=smith&itemsPerPage=50');
		});

		it('should drop the page number so the results start from page 1', () => {
			const [tag] = buildActiveFilterTags(
				options,
				[BRISTOL_ID],
				'/applications',
				query({ page: '3', lpa: BRISTOL_ID })
			);

			assert.strictEqual(tag.removeUrl, '/applications');
		});

		it('should use the base URL it is given', () => {
			const [tag] = buildActiveFilterTags(options, [BRISTOL_ID], '/somewhere', query({ lpa: BRISTOL_ID }));

			assert.ok(tag.removeUrl.startsWith('/somewhere'));
		});
	});

	describe('buildLpaFilterSections', () => {
		const items = buildLpaFilterItems(options, [BRISTOL_ID]);

		it('should return no sections when there are no LPAs', () => {
			assert.deepStrictEqual(buildLpaFilterSections([], false), []);
		});

		it('should return one checkboxes section named after the LPA param', () => {
			const sections = buildLpaFilterSections(items, true);

			assert.strictEqual(sections.length, 1);
			assert.strictEqual(sections[0].type, 'checkboxes');
			assert.strictEqual(sections[0].name, LPA_PARAM);
			assert.strictEqual(sections[0].open, true);
			assert.strictEqual(sections[0].options.items[0].displayName, 'Bristol City Council (3)');
			assert.strictEqual(sections[0].options.items[0].checked, true);
		});

		it('should pass the open flag through', () => {
			assert.strictEqual(buildLpaFilterSections(items, false)[0].open, false);
		});
	});
});
