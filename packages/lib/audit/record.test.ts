import { describe, it, mock } from 'node:test';
import assert from 'node:assert/strict';
import { recordAuditSafely } from './record.ts';
import { SHARED_AUDIT_ACTIONS } from './shared-actions.ts';
import { CASE_DATA_MODEL, type CaseDataModel } from '../util/types.ts';
import type { AuditEntry } from './types.ts';

const entry = { caseId: 'case-1', userId: 'user-1', action: SHARED_AUDIT_ACTIONS.FILE_DELETED, metadata: {} };

// Typed like the real functions, so the recorded arguments are typed too
const recordManyMock = () => mock.fn(async (_entries: AuditEntry[], _dataModel: CaseDataModel) => {});
const logErrorMock = () => mock.fn((_context: Record<string, unknown>, _message?: string) => {});

function buildService(overrides: Record<string, unknown> = {}) {
	return {
		audit: { recordMany: recordManyMock() },
		logger: { error: logErrorMock() },
		...overrides
	};
}

describe('recordAuditSafely', () => {
	it('should record the entries', async () => {
		const service = buildService();

		await recordAuditSafely({ service: service as never, dataModel: CASE_DATA_MODEL.S62A, entries: [entry] });

		assert.strictEqual(service.audit.recordMany.mock.callCount(), 1);
		assert.deepStrictEqual(service.audit.recordMany.mock.calls[0].arguments, [[entry], CASE_DATA_MODEL.S62A]);
	});

	it('should skip nulls, and not record at all if nothing is left', async () => {
		const service = buildService();

		await recordAuditSafely({ service: service as never, dataModel: CASE_DATA_MODEL.S62A, entries: [null] });

		assert.strictEqual(service.audit.recordMany.mock.callCount(), 0);
	});

	it('should do nothing when auditing is switched off', async () => {
		const service = buildService({ isAuditLive: false });

		await recordAuditSafely({ service: service as never, dataModel: CASE_DATA_MODEL.S62A, entries: [entry] });

		assert.strictEqual(service.audit.recordMany.mock.callCount(), 0);
	});

	it('should do nothing when there is no audit service', async () => {
		const service = buildService({ audit: undefined });

		await assert.doesNotReject(() =>
			recordAuditSafely({ service: service as never, dataModel: CASE_DATA_MODEL.S62A, entries: [entry] })
		);
	});

	it('should log, not throw, when recording fails', async () => {
		const recordMany = recordManyMock();
		recordMany.mock.mockImplementation(async () => {
			throw new Error('Audit unavailable');
		});
		const service = buildService({ audit: { recordMany } });

		await assert.doesNotReject(() =>
			recordAuditSafely({
				service: service as never,
				dataModel: CASE_DATA_MODEL.S62A,
				entries: [entry],
				logContext: { caseId: 'case-1' }
			})
		);

		assert.strictEqual(service.logger.error.mock.callCount(), 1);
		assert.strictEqual(service.logger.error.mock.calls[0].arguments[0].caseId, 'case-1');
	});
});
