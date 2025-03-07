import { describe, it } from 'node:test';
import { optionalWhere } from './database.js';
import assert from 'node:assert';

describe('database', () => {
	describe('optionalWhere', () => {
		it('should return undefined if no id', () => {
			const result = optionalWhere();
			assert.strictEqual(result, undefined);
		});
		it('should return where clause if id', () => {
			const result = optionalWhere('id-1');
			assert.deepStrictEqual(result, { id: 'id-1' });
		});
	});
});
