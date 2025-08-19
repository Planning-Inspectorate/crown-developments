import { describe, it } from 'node:test';
import assert from 'node:assert';
import { getStringQueries, createWhereClause } from './search-queries.js';

describe('getStringQueries', () => {
	it('should split comma-separated values', () => {
		assert.deepStrictEqual(getStringQueries('a,b,c'), ['a', 'b', 'c']);
	});
	it('should split whitespace-separated values', () => {
		assert.deepStrictEqual(getStringQueries('a b c'), ['a', 'b', 'c']);
	});
	it('should split mixed comma and whitespace', () => {
		assert.deepStrictEqual(getStringQueries('a, b c ,d'), ['a', 'b', 'c', 'd']);
	});
	it('should trim and filter empty values', () => {
		assert.deepStrictEqual(getStringQueries(' a  , , b ,,c ,  '), ['a', 'b', 'c']);
	});
	it('should return undefined for undefined input', () => {
		assert.strictEqual(getStringQueries(undefined), undefined);
	});
	it('should return undefined for empty string', () => {
		assert.deepStrictEqual(getStringQueries(''), undefined);
	});
});

describe('createWhereClause', () => {
	describe('single queries', () => {
		const options = [{ fields: ['name'], searchType: 'contains' }];

		it('should return undefined for empty queries', () => {
			assert.strictEqual(createWhereClause(undefined, options), undefined);
			assert.strictEqual(createWhereClause([], options), undefined);
		});

		it('should create where clause for single query', () => {
			const result = createWhereClause(['foo'], options);
			assert.deepStrictEqual(result, { AND: [{ OR: [{ name: { contains: 'foo' } }] }] });
		});

		it('should by default join multiple queries with OR', () => {
			const result = createWhereClause(['foo', 'bar'], options);
			assert.deepStrictEqual(result, {
				AND: [{ OR: [{ name: { contains: 'foo' } }] }, { OR: [{ name: { contains: 'bar' } }] }]
			});
		});

		it('should join with "and" if specified in lowercase', () => {
			const optionsWithOr = [{ fields: ['name'], searchType: 'contains', logic: 'and' }];
			const result = createWhereClause(['foo', 'bar'], optionsWithOr);
			assert.deepStrictEqual(result, {
				AND: [{ AND: [{ name: { contains: 'foo' } }] }, { AND: [{ name: { contains: 'bar' } }] }]
			});
		});

		it('should join with "and" if specified in uppercase', () => {
			const optionsWithOr = [{ fields: ['name'], searchType: 'contains', logic: 'AND' }];
			const result = createWhereClause(['foo', 'bar'], optionsWithOr);
			assert.deepStrictEqual(result, {
				AND: [{ AND: [{ name: { contains: 'foo' } }] }, { AND: [{ name: { contains: 'bar' } }] }]
			});
		});

		it('should throw missing searchType', () => {
			const opts = [{ fields: ['name'] }];
			assert.throws(() => createWhereClause(['foo'], opts), {
				message: 'Missing options for creating the query.'
			});
		});
		it('should throw missing fields', () => {
			const opts = [{ searchType: 'contains' }];
			assert.throws(() => createWhereClause(['foo'], opts), {
				message: 'Missing options for creating the query.'
			});
		});
	});
	describe('single multi-fields queries', () => {
		const options = [{ fields: ['name', 'age'], searchType: 'contains' }];

		it('should create where clause for single query', () => {
			const result = createWhereClause(['foo'], options);
			assert.deepStrictEqual(result, {
				AND: [{ OR: [{ name: { contains: 'foo' } }, { age: { contains: 'foo' } }] }]
			});
		});

		it('should by default join multiple queries with &', () => {
			const result = createWhereClause(['foo', 'bar'], options);
			assert.deepStrictEqual(result, {
				AND: [
					{ OR: [{ name: { contains: 'foo' } }, { age: { contains: 'foo' } }] },
					{ OR: [{ name: { contains: 'bar' } }, { age: { contains: 'bar' } }] }
				]
			});
		});
	});
	describe('multiple field queries', () => {
		const options = [
			{ fields: ['name', 'age'], searchType: 'contains' },
			{ fields: ['desc'], searchType: 'startsWith' }
		];

		it('should return undefined for empty queries', () => {
			assert.strictEqual(createWhereClause(undefined, options), undefined);
			assert.strictEqual(createWhereClause([], options), undefined);
		});

		it('should create where clause for single query', () => {
			const result = createWhereClause(['foo'], options);
			assert.deepStrictEqual(result, {
				OR: [
					{ AND: [{ OR: [{ name: { contains: 'foo' } }, { age: { contains: 'foo' } }] }] },
					{ AND: [{ OR: [{ desc: { startsWith: 'foo' } }] }] }
				]
			});
		});

		it('should by default join multiple queries with &', () => {
			const result = createWhereClause(['foo', 'bar'], options);
			assert.deepStrictEqual(result, {
				OR: [
					{
						AND: [
							{ OR: [{ name: { contains: 'foo' } }, { age: { contains: 'foo' } }] },
							{ OR: [{ name: { contains: 'bar' } }, { age: { contains: 'bar' } }] }
						]
					},
					{ AND: [{ OR: [{ desc: { startsWith: 'foo' } }] }, { OR: [{ desc: { startsWith: 'bar' } }] }] }
				]
			});
		});

		it('should throw with empty options', () => {
			assert.throws(() => createWhereClause(['foo']), {
				message: 'Missing options for creating the query.'
			});
		});

		it('should throw with missing fields', () => {
			const badOptions = [{}, { field: 'x', searchType: 'contains' }];
			assert.throws(() => createWhereClause(['foo'], badOptions), {
				message: 'Missing options for creating the query.'
			});
		});
	});
	describe('single embedded parent queries', () => {
		const options = [{ parent: 'Contact', fields: ['firstName', 'lastName'], searchType: 'contains' }];

		it('should create where clause with parent and single field', () => {
			const singleFieldOptions = [{ parent: 'Profile', fields: ['email'], searchType: 'contains' }];
			const result = createWhereClause(['test'], singleFieldOptions);
			assert.deepStrictEqual(result, { Profile: { AND: [{ OR: [{ email: { contains: 'test' } }] }] } });
		});

		it('should create where clause with parent', () => {
			const result = createWhereClause(['foo'], options);
			assert.deepStrictEqual(result, {
				Contact: { AND: [{ OR: [{ firstName: { contains: 'foo' } }, { lastName: { contains: 'foo' } }] }] }
			});
		});

		it('should create where clause with a mix of parents and no parents', () => {
			options.push({ fields: ['city'], searchType: 'startsWith' });
			const result = createWhereClause(['foo'], options);
			assert.deepStrictEqual(result, {
				OR: [
					{
						Contact: {
							AND: [
								{
									OR: [{ firstName: { contains: 'foo' } }, { lastName: { contains: 'foo' } }]
								}
							]
						}
					},
					{
						AND: [{ OR: [{ city: { startsWith: 'foo' } }] }]
					}
				]
			});
		});

		it('should throw if parent is not a string', () => {
			const badOptions = [{ parent: 123, fields: ['name'], searchType: 'contains' }];
			assert.throws(() => createWhereClause(['foo'], badOptions), {
				message: 'Parent must be a string if provided.'
			});
		});
	});
	describe('additional edge cases', () => {
		it('should respect logic when parent is present', () => {
			const options = [{ parent: 'User', fields: ['first', 'last'], searchType: 'contains', logic: 'or' }];
			const result = createWhereClause(['foo', 'bar'], options);
			assert.deepStrictEqual(result, {
				User: {
					AND: [
						{ OR: [{ first: { contains: 'foo' } }, { last: { contains: 'foo' } }] },
						{ OR: [{ first: { contains: 'bar' } }, { last: { contains: 'bar' } }] }
					]
				}
			});
		});

		it('should handle multiple parents', () => {
			const options = [
				{ parent: 'User', fields: ['first', 'last'], searchType: 'contains' },
				{ parent: 'Profile', fields: ['email'], searchType: 'startsWith' }
			];
			const result = createWhereClause(['baz', 'buzz'], options);
			assert.deepStrictEqual(result, {
				OR: [
					{
						User: {
							AND: [
								{ OR: [{ first: { contains: 'baz' } }, { last: { contains: 'baz' } }] },
								{ OR: [{ first: { contains: 'buzz' } }, { last: { contains: 'buzz' } }] }
							]
						}
					},
					{
						Profile: {
							AND: [{ OR: [{ email: { startsWith: 'baz' } }] }, { OR: [{ email: { startsWith: 'buzz' } }] }]
						}
					}
				]
			});
		});

		it('should throw with options as empty array', () => {
			assert.throws(() => createWhereClause(['foo'], []), {
				message: 'Missing options for creating the query.'
			});
		});

		it('should handle logic case insensitivity (And, aND, etc)', () => {
			const options = [{ fields: ['name'], searchType: 'contains', logic: 'AnD' }];
			const result = createWhereClause(['foo', 'bar'], options);
			assert.deepStrictEqual(result, {
				AND: [{ AND: [{ name: { contains: 'foo' } }] }, { AND: [{ name: { contains: 'bar' } }] }]
			});
		});

		it('should handle non-string queries', () => {
			const options = [{ fields: ['id'], searchType: 'equals' }];
			const result = createWhereClause([123, 456], options);
			assert.deepStrictEqual(result, { AND: [{ OR: [{ id: { equals: 123 } }] }, { OR: [{ id: { equals: 456 } }] }] });
		});
	});
});
