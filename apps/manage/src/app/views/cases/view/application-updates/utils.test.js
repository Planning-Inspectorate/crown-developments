import { describe, it } from 'node:test';
import assert from 'node:assert';
import { validateParams } from './utils.js';

describe('utils.js', () => {
	describe('validateParams', () => {
		it('should successfully validate params if id and updateId are present', async () => {
			assert.deepStrictEqual(validateParams({ id: 'id-01', updateId: 'app-update-01' }), {
				id: 'id-01',
				applicationUpdateId: 'app-update-01'
			});
		});
		it('should return error if id param not present', async () => {
			assert.throws(() => validateParams({}), { message: 'id param required' });
		});
		it('should return error if updateId param not present', async () => {
			assert.throws(() => validateParams({ id: 'id-01' }), { message: 'application update id param required' });
		});
	});
});
