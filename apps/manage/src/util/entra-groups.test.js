import { describe, it, mock } from 'node:test';
import { getEntraGroupMembers } from '#util/entra-groups.js';
import { mockLogger } from '@pins/crowndev-lib/testing/mock-logger.js';
import assert from 'node:assert';

describe('entra-groups', () => {
	describe('getEntraGroupMembers', () => {
		it('should return empty if no client', async () => {
			const logger = mockLogger();
			const members = await getEntraGroupMembers({
				logger,
				initClient: () => null,
				session: {},
				groupIds: {}
			});
			assert.strictEqual(members.caseOfficers.length, 0);
			assert.strictEqual(members.inspectors.length, 0);
			assert.strictEqual(logger.warn.mock.callCount(), 1);
		});
		it('should call client if available', async () => {
			const logger = mockLogger();
			const mockClient = {
				listAllGroupMembers: mock.fn(() => [1, 2, 3])
			};
			const members = await getEntraGroupMembers({
				logger,
				initClient: () => mockClient,
				session: {},
				groupIds: {}
			});
			assert.strictEqual(members.caseOfficers.length, 3);
			assert.strictEqual(members.inspectors.length, 3);
			assert.strictEqual(logger.info.mock.callCount(), 1);
		});
	});
});
