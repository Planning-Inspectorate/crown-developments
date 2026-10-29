import { describe, it, mock } from 'node:test';
import assert from 'node:assert';
import { buildRecordCrownCaseAction } from './case-actions.ts';
import { SHARED_AUDIT_ACTIONS } from '@pins/crowndev-lib/audit/shared-actions.ts';
import { CASE_DATA_MODEL } from '@pins/crowndev-lib/util/types.ts';

describe('buildRecordCrownCaseAction', () => {
	it('should record a published case action with the request case reference and user id', async () => {
		const mockRecordMany = mock.fn();
		const service = {
			logger: { error: mock.fn() },
			audit: { recordMany: mockRecordMany },
			isAuditLive: true
		};

		const hook = buildRecordCrownCaseAction(service as any, SHARED_AUDIT_ACTIONS.CASE_PUBLISHED);

		await hook(
			{
				session: { account: { localAccountId: 'user-123' } },
				caseReference: 'CRN/2026/001'
			} as any,
			'crown-case-1'
		);

		assert.strictEqual(mockRecordMany.mock.callCount(), 1);
		const [entries, dataModel] = mockRecordMany.mock.calls[0].arguments;

		assert.strictEqual(dataModel, CASE_DATA_MODEL.CROWN);
		assert.deepStrictEqual(entries, [
			{
				caseId: 'crown-case-1',
				userId: 'user-123',
				action: SHARED_AUDIT_ACTIONS.CASE_PUBLISHED,
				metadata: { reference: 'CRN/2026/001' }
			}
		]);
	});

	it('should record an unpublished case action with the correct reference metadata', async () => {
		const mockRecordMany = mock.fn();
		const service = {
			logger: { error: mock.fn() },
			audit: { recordMany: mockRecordMany },
			isAuditLive: true
		};

		const hook = buildRecordCrownCaseAction(service as any, SHARED_AUDIT_ACTIONS.CASE_UNPUBLISHED);

		await hook(
			{
				session: { account: { localAccountId: 'user-456' } },
				caseReference: 'CRN/2026/005'
			} as any,
			'crown-case-5'
		);

		const [entries] = mockRecordMany.mock.calls[0].arguments;
		assert.strictEqual(entries[0].action, SHARED_AUDIT_ACTIONS.CASE_UNPUBLISHED);
		assert.deepStrictEqual(entries[0].metadata, { reference: 'CRN/2026/005' });
	});

	it('should fall back to the case id when no case reference is present', async () => {
		const mockRecordMany = mock.fn();
		const service = {
			logger: { error: mock.fn() },
			audit: { recordMany: mockRecordMany },
			isAuditLive: true
		};

		const hook = buildRecordCrownCaseAction(service as any, SHARED_AUDIT_ACTIONS.CASE_PUBLISHED);

		await hook(
			{
				session: { account: { localAccountId: 'user-123' } }
			} as any,
			'crown-case-9'
		);

		const [entries] = mockRecordMany.mock.calls[0].arguments;
		assert.deepStrictEqual(entries[0].metadata, { reference: 'crown-case-9' });
	});

	it('should record nothing when Crown auditing is switched off', async () => {
		const mockRecordMany = mock.fn();
		const service = {
			logger: { error: mock.fn() },
			audit: { recordMany: mockRecordMany },
			isAuditLive: false
		};

		const hook = buildRecordCrownCaseAction(service as any, SHARED_AUDIT_ACTIONS.CASE_PUBLISHED);

		await hook(
			{
				session: { account: { localAccountId: 'user-123' } },
				caseReference: 'CRN/2026/001'
			} as any,
			'crown-case-1'
		);

		assert.strictEqual(mockRecordMany.mock.callCount(), 0);
	});
});
