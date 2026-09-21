import { describe, it, mock } from 'node:test';
import { getEntraGroupMembers } from './entra-groups.ts';
import { mockLogger } from '@pins/crowndev-lib/testing/mock-logger.ts';
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
		it('should populate members with correct data based on groupId passed', async () => {
			const logger = mockLogger();
			const groupIds = {
				caseOfficers: 'co-group',
				inspectors: 'insp-group',
				s62aInspectors: 's62a-insp-group',
				s62aReaders: 's62a-readers-group',
				s62aPlanningOfficers: 's62a-po-group'
			};
			const byGroup = {
				'co-group': [{ id: '1', displayName: 'Case Officer 1' }],
				'insp-group': [{ id: '2', displayName: 'Inspector 2' }],
				's62a-insp-group': [{ id: '3', displayName: 'S62A Inspector 3' }],
				's62a-readers-group': [{ id: '4', displayName: 'Reader 4' }],
				's62a-po-group': [{ id: '5', displayName: 'Planning Officer 5' }]
			};
			const mockClient = {
				listAllGroupMembers: mock.fn((groupId) => byGroup[groupId] ?? [])
			};
			const members = await getEntraGroupMembers({
				logger,
				initClient: () => mockClient,
				session: {},
				groupIds
			});

			assert.strictEqual(mockClient.listAllGroupMembers.mock.callCount(), 5);
			const calledWith = mockClient.listAllGroupMembers.mock.calls.map((c) => c.arguments[0]);
			assert.deepStrictEqual(calledWith, [
				'co-group',
				'insp-group',
				's62a-insp-group',
				's62a-readers-group',
				's62a-po-group'
			]);
			assert.deepStrictEqual(members.caseOfficers, [{ id: '1', displayName: 'Case Officer 1' }]);
			assert.deepStrictEqual(members.inspectors, [{ id: '2', displayName: 'Inspector 2' }]);
			assert.deepStrictEqual(members.s62aInspectors, [{ id: '3', displayName: 'S62A Inspector 3' }]);
			assert.deepStrictEqual(members.s62aReaders, [{ id: '4', displayName: 'Reader 4' }]);
			assert.deepStrictEqual(members.s62aPlanningOfficers, [{ id: '5', displayName: 'Planning Officer 5' }]);
			// Assessors are a combination of s62aInspectors and s62aReaders
			assert.deepStrictEqual(members.s62aAssessors, [
				{ id: '3', displayName: 'S62A Inspector 3' },
				{ id: '4', displayName: 'Reader 4' }
			]);
		});
		it('should dedup assessor group where user is in both readers and inspector groups', async () => {
			const logger = mockLogger();
			const groupIds = {
				s62aInspectors: 's62a-insp-group',
				s62aReaders: 's62a-readers-group'
			};
			const byGroup = {
				's62a-insp-group': [
					{ id: '3', displayName: 'S62A Inspector 3' },
					{ id: 'shared', displayName: 'Dup' }
				],
				's62a-readers-group': [
					{ id: '4', displayName: 'Reader 4' },
					{ id: 'shared', displayName: 'Dup' }
				]
			};
			const mockClient = {
				listAllGroupMembers: mock.fn((groupId) => byGroup[groupId] ?? [])
			};
			const members = await getEntraGroupMembers({
				logger,
				initClient: () => mockClient,
				session: {},
				groupIds
			});
			assert.strictEqual(members.s62aAssessors.length, 3);
			assert.deepStrictEqual(members.s62aAssessors, [
				{ id: '3', displayName: 'S62A Inspector 3' },
				{ id: 'shared', displayName: 'Dup' },
				{ id: '4', displayName: 'Reader 4' }
			]);
		});
	});
});
