import { describe, it, mock } from 'node:test';
import assert from 'node:assert/strict';
import type { Request } from 'express';
import type { ManageService } from '#service';
import type { AuditEntry } from '@pins/crowndev-lib/audit/index.ts';
import { SHARED_AUDIT_ACTIONS } from '@pins/crowndev-lib/audit/shared-actions.ts';
import { CASE_DATA_MODEL, type CaseDataModel } from '@pins/crowndev-lib/util/types.ts';
import { buildRecordS62aCaseAction } from './case-actions.ts';

function buildService(reference: string | null) {
	const recordMany = mock.fn<(entries: AuditEntry[], dataModel: CaseDataModel) => Promise<void>>(async () => {});
	const service = {
		db: { s62aCase: { findUnique: mock.fn(async () => (reference ? { reference } : null)) } },
		audit: { recordMany },
		logger: { info: mock.fn(), warn: mock.fn(), error: mock.fn() }
	} as unknown as ManageService;

	return { service, recordMany };
}

const req = { session: { account: { localAccountId: 'user-1' } } } as unknown as Request;

describe('buildRecordS62aCaseAction', () => {
	it('should record the case being published, with its reference', async () => {
		const { service, recordMany } = buildService('S62A/2026/0000037');

		await buildRecordS62aCaseAction(service, SHARED_AUDIT_ACTIONS.CASE_PUBLISHED)(req, 'case-1');

		assert.deepStrictEqual(recordMany.mock.calls[0].arguments, [
			[
				{
					caseId: 'case-1',
					userId: 'user-1',
					action: SHARED_AUDIT_ACTIONS.CASE_PUBLISHED,
					metadata: { reference: 'S62A/2026/0000037' }
				}
			],
			CASE_DATA_MODEL.S62A
		]);
	});

	it('should record the case being unpublished', async () => {
		const { service, recordMany } = buildService('S62A/2026/0000037');

		await buildRecordS62aCaseAction(service, SHARED_AUDIT_ACTIONS.CASE_UNPUBLISHED)(req, 'case-1');

		const [[entry]] = recordMany.mock.calls[0].arguments;
		assert.strictEqual(entry.action, SHARED_AUDIT_ACTIONS.CASE_UNPUBLISHED);
	});

	it('should fall back to the case ID if the reference cannot be found', async () => {
		const { service, recordMany } = buildService(null);

		await buildRecordS62aCaseAction(service, SHARED_AUDIT_ACTIONS.CASE_PUBLISHED)(req, 'case-1');

		const [[entry]] = recordMany.mock.calls[0].arguments;
		assert.deepStrictEqual(entry.metadata, { reference: 'case-1' });
	});

	it('should log, not throw, if the case cannot be looked up', async () => {
		const { service, recordMany } = buildService('S62A/2026/0000037');
		(service.db.s62aCase.findUnique as unknown as ReturnType<typeof mock.fn>).mock.mockImplementation(async () => {
			throw new Error('Database error');
		});

		await assert.doesNotReject(() =>
			buildRecordS62aCaseAction(service, SHARED_AUDIT_ACTIONS.CASE_PUBLISHED)(req, 'case-1')
		);
		assert.strictEqual(recordMany.mock.callCount(), 0);
		assert.strictEqual((service.logger.error as unknown as ReturnType<typeof mock.fn>).mock.callCount(), 1);
	});
});
