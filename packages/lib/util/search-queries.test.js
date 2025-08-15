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
		assert.deepStrictEqual(getStringQueries(' a , , b ,,c '), ['a', 'b', 'c']);
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
			assert.deepStrictEqual(result, { name: { contains: 'foo' } });
		});

		it('should by default join multiple queries with &', () => {
			const result = createWhereClause(['foo', 'bar'], options);
			assert.deepStrictEqual(result, { name: { contains: 'foo & bar' } });
		});

		it('should join with or if specified in lowercase', () => {
			const optionsWithOr = [{ fields: ['name'], searchType: 'contains', logic: 'or' }];
			const result = createWhereClause(['foo', 'bar'], optionsWithOr);
			assert.deepStrictEqual(result, { name: { contains: 'foo | bar' } });
		});

		it('should join with or if specified in uppercase', () => {
			const optionsWithOr = [{ fields: ['name'], searchType: 'contains', logic: 'OR' }];
			const result = createWhereClause(['foo', 'bar'], optionsWithOr);
			assert.deepStrictEqual(result, { name: { contains: 'foo | bar' } });
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
			assert.deepStrictEqual(result, { OR: [{ name: { contains: 'foo' } }, { age: { contains: 'foo' } }] });
		});

		it('should by default join multiple queries with &', () => {
			const result = createWhereClause(['foo', 'bar'], options);
			assert.deepStrictEqual(result, { OR: [{ name: { contains: 'foo & bar' } }, { age: { contains: 'foo & bar' } }] });
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
				OR: [{ name: { contains: 'foo' } }, { age: { contains: 'foo' } }, { desc: { startsWith: 'foo' } }]
			});
		});

		it('should by default join multiple queries with &', () => {
			const result = createWhereClause(['foo', 'bar'], options);
			assert.deepStrictEqual(result, {
				OR: [
					{ name: { contains: 'foo & bar' } },
					{ age: { contains: 'foo & bar' } },
					{ desc: { startsWith: 'foo & bar' } }
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

		it('should create where clause with parent', () => {
			const result = createWhereClause(['foo'], options);
			assert.deepStrictEqual(result, {
				Contact: {
					OR: [{ firstName: { contains: 'foo' } }, { lastName: { contains: 'foo' } }]
				}
			});
		});

		it('should create where clause with a mix of parents and no parents', () => {
			options.push({ fields: ['city'], searchType: 'startsWith' });
			const result = createWhereClause(['foo'], options);
			assert.deepStrictEqual(result, {
				OR: [
					{
						Contact: {
							OR: [{ firstName: { contains: 'foo' } }, { lastName: { contains: 'foo' } }]
						}
					},
					{
						city: { startsWith: 'foo' }
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
});
