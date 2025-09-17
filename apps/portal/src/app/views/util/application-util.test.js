import { describe, it, mock } from 'node:test';
import assert from 'node:assert';
import { shouldDisplayApplicationUpdatesLink } from './application-util.js';

describe('application-util', () => {
	describe('shouldDisplayApplicationUpdatesLink', () => {
		it('should return true if application update count is greater than 0', async () => {
			const mockDb = {
				applicationUpdate: {
					count: mock.fn(() => 3)
				}
			};
			const response = await shouldDisplayApplicationUpdatesLink(mockDb, 'id');
			assert.strictEqual(response, true);
		});
		it('should return false if application update count is 0', async () => {
			const mockDb = {
				applicationUpdate: {
					count: mock.fn(() => 0)
				}
			};
			const response = await shouldDisplayApplicationUpdatesLink(mockDb, 'id');
			assert.strictEqual(response, false);
		});
	});
});
