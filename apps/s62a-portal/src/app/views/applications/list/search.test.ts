import { describe, it } from 'node:test';
import assert from 'node:assert';
import type { Request } from 'express';
import type { Prisma } from '@pins/crowndev-database/src/client/client.ts';
import { ORGANISATION_ROLES_ID } from '@pins/crowndev-database/src/seed/data-static.ts';
import { SEARCH_PARAM, buildListWhere, getCarriedParams, getSearchValue } from './search.ts';

/** Query objects in tests are plain objects, Express types them as ParsedQs */
const query = (q: Record<string, unknown> | undefined) => q as unknown as Request['query'];

/** The clause expected for a single search term */
function expectedTermClause(term: string): Prisma.S62aCaseWhereInput {
	return {
		OR: [
			{ reference: { contains: term } },
			{ Lpa: { name: { contains: term } } },
			{ SecondaryLpa: { name: { contains: term } } },
			{ SiteAddress: { postcode: { contains: term } } },
			{
				S62aToApplicants: {
					some: {
						roleId: ORGANISATION_ROLES_ID.APPLICANT,
						OR: [
							{ Organisation: { name: { contains: term } } },
							{ Contact: { firstName: { contains: term } } },
							{ Contact: { lastName: { contains: term } } }
						]
					}
				}
			}
		]
	};
}

describe('list search', () => {
	describe('SEARCH_PARAM', () => {
		it('should match the name the search bar macro submits', () => {
			// the shared searchBar macro hard-codes name="searchCriteria"
			assert.strictEqual(SEARCH_PARAM, 'searchCriteria');
		});
	});

	describe('getSearchValue', () => {
		it('should return the search term', () => {
			assert.strictEqual(getSearchValue(query({ searchCriteria: 'smith' })), 'smith');
		});

		it('should trim surrounding whitespace', () => {
			assert.strictEqual(getSearchValue(query({ searchCriteria: '  smith  ' })), 'smith');
		});

		it('should keep whitespace inside the term', () => {
			assert.strictEqual(getSearchValue(query({ searchCriteria: 'SW1A 2AA' })), 'SW1A 2AA');
		});

		it('should return an empty string for a whitespace-only term', () => {
			assert.strictEqual(getSearchValue(query({ searchCriteria: '   ' })), '');
		});

		it('should return an empty string when the param is missing', () => {
			assert.strictEqual(getSearchValue(query({})), '');
		});

		it('should return an empty string when there is no query at all', () => {
			assert.strictEqual(getSearchValue(query(undefined)), '');
		});

		it('should use the first value when the param is repeated', () => {
			assert.strictEqual(getSearchValue(query({ searchCriteria: ['first', 'second'] })), 'first');
		});

		it('should ignore nested objects, e.g. ?searchCriteria[a]=b', () => {
			assert.strictEqual(getSearchValue(query({ searchCriteria: { a: 'b' } })), '');
		});

		it('should ignore other params', () => {
			assert.strictEqual(getSearchValue(query({ other: 'smith' })), '');
		});
	});

	describe('buildListWhere', () => {
		const now = new Date('2026-01-01T00:00:00.000Z');
		const publishedClause = { S62aDates: { publishDate: { lte: now } } };

		it('should only filter on published cases when there is no search term', () => {
			assert.deepStrictEqual(buildListWhere(now, ''), { AND: [publishedClause] });
		});

		it('should treat a whitespace-only term as no search', () => {
			assert.deepStrictEqual(buildListWhere(now, '   '), { AND: [publishedClause] });
		});

		it('should add a clause covering every searchable field for a single term', () => {
			assert.deepStrictEqual(buildListWhere(now, 'smith'), {
				AND: [publishedClause, expectedTermClause('smith')]
			});
		});

		it('should require every word to match, with one clause per word', () => {
			assert.deepStrictEqual(buildListWhere(now, 'smith london'), {
				AND: [publishedClause, expectedTermClause('smith'), expectedTermClause('london')]
			});
		});

		it('should split terms on commas as well as spaces', () => {
			assert.deepStrictEqual(buildListWhere(now, 'smith,london'), {
				AND: [publishedClause, expectedTermClause('smith'), expectedTermClause('london')]
			});
		});

		it('should split a postcode with a space into two terms', () => {
			const where = buildListWhere(now, 'SW1A 2AA');
			assert.deepStrictEqual(where, {
				AND: [publishedClause, expectedTermClause('SW1A'), expectedTermClause('2AA')]
			});
		});

		it('should always keep the published filter first so unpublished cases are never searchable', () => {
			const and = buildListWhere(now, 'anything').AND as Prisma.S62aCaseWhereInput[];
			assert.deepStrictEqual(and[0], publishedClause);
		});

		it('should only search applicants, not agents', () => {
			const and = buildListWhere(now, 'agentco').AND as Prisma.S62aCaseWhereInput[];
			const termOr = and[1].OR as Prisma.S62aCaseWhereInput[];
			const applicantClause = termOr.find((clause) => clause.S62aToApplicants);
			assert.deepStrictEqual(applicantClause?.S62aToApplicants?.some?.roleId, ORGANISATION_ROLES_ID.APPLICANT);
		});

		it('should search both the primary and the secondary LPA', () => {
			const and = buildListWhere(now, 'southmere').AND as Prisma.S62aCaseWhereInput[];
			const termOr = and[1].OR as Prisma.S62aCaseWhereInput[];
			assert.ok(termOr.some((clause) => clause.Lpa));
			assert.ok(termOr.some((clause) => clause.SecondaryLpa));
		});

		it('should pass the term through as data, not as part of the query structure', () => {
			const hostile = `'; DROP TABLE S62aCase; --`;
			const and = buildListWhere(now, hostile).AND as Prisma.S62aCaseWhereInput[];
			// split on whitespace, so each piece is a separate contains value
			assert.strictEqual(and.length, 1 + hostile.split(/[\s,]+/).filter(Boolean).length);
			assert.deepStrictEqual(and[1], expectedTermClause("';"));
		});
	});

	describe('getCarriedParams', () => {
		it('should return an empty array when there is no query', () => {
			assert.deepStrictEqual(getCarriedParams(query(undefined)), []);
		});

		it('should return an empty array for an empty query', () => {
			assert.deepStrictEqual(getCarriedParams(query({})), []);
		});

		it('should carry itemsPerPage', () => {
			assert.deepStrictEqual(getCarriedParams(query({ itemsPerPage: '50' })), [{ name: 'itemsPerPage', value: '50' }]);
		});

		it('should exclude the search term, which the search box supplies itself', () => {
			assert.deepStrictEqual(getCarriedParams(query({ searchCriteria: 'smith' })), []);
		});

		it('should exclude the page number so a new search starts at page 1', () => {
			assert.deepStrictEqual(getCarriedParams(query({ page: '3' })), []);
		});

		it('should carry every other param, in order', () => {
			const result = getCarriedParams(
				query({ searchCriteria: 'smith', page: '2', itemsPerPage: '100', lpa: 'abc', foo: 'bar' })
			);
			assert.deepStrictEqual(result, [
				{ name: 'itemsPerPage', value: '100' },
				{ name: 'lpa', value: 'abc' },
				{ name: 'foo', value: 'bar' }
			]);
		});

		it('should carry each value of a repeated param, as the filters will need', () => {
			const result = getCarriedParams(query({ lpa: ['a', 'b'] }));
			assert.deepStrictEqual(result, [
				{ name: 'lpa', value: 'a' },
				{ name: 'lpa', value: 'b' }
			]);
		});

		it('should drop non-string values', () => {
			const result = getCarriedParams(query({ nested: { a: 'b' }, mixed: ['ok', { a: 'b' }], count: 5 }));
			assert.deepStrictEqual(result, [{ name: 'mixed', value: 'ok' }]);
		});

		it('should keep empty string values', () => {
			assert.deepStrictEqual(getCarriedParams(query({ itemsPerPage: '' })), [{ name: 'itemsPerPage', value: '' }]);
		});
	});
});
