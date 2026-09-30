import { describe, it, mock } from 'node:test';
import assert from 'node:assert/strict';
import type { Request } from 'express';
import type { ManageService } from '#service';
import type { AuditEntry } from '@pins/crowndev-lib/audit/index.ts';
import { UNKNOWN_AUDIT_USER_ID } from '@pins/crowndev-lib/audit/user.ts';
import { CASE_DATA_MODEL, type CaseDataModel } from '@pins/crowndev-lib/util/types.ts';
import { REPRESENTATION_CATEGORY_ID, REPRESENTATION_STATUS_ID } from '@pins/crowndev-database/src/seed/data-static.ts';
import { S62A_AUDIT_ACTIONS } from './actions.ts';
import {
	recordS62aRepresentationAudit,
	recordS62aRepresentationUpdates,
	resolveRepresentationReviewAction
} from './representations.ts';

function buildService({ isAuditLive }: { isAuditLive?: boolean } = {}) {
	const recordMany = mock.fn<(entries: AuditEntry[], dataModel: CaseDataModel) => Promise<void>>(async () => {});
	const error = mock.fn();
	const service = {
		audit: { recordMany },
		logger: { info: mock.fn(), warn: mock.fn(), error },
		isAuditLive
	} as unknown as ManageService;

	return { service, recordMany, error };
}

const req = { session: { account: { localAccountId: 'user-1' } } } as unknown as Request;

describe('recordS62aRepresentationAudit', () => {
	it('should record the action with the representation reference', async () => {
		const { service, recordMany } = buildService();

		await recordS62aRepresentationAudit(
			service,
			req,
			'case-1',
			'353RK-4766',
			S62A_AUDIT_ACTIONS.REPRESENTATION_WITHDRAWN
		);

		assert.deepStrictEqual(recordMany.mock.calls[0].arguments, [
			[
				{
					caseId: 'case-1',
					userId: 'user-1',
					action: S62A_AUDIT_ACTIONS.REPRESENTATION_WITHDRAWN,
					metadata: { reference: '353RK-4766' }
				}
			],
			CASE_DATA_MODEL.S62A
		]);
	});

	it('should record the unknown user when there is no signed-in user', async () => {
		const { service, recordMany } = buildService();

		await recordS62aRepresentationAudit(
			service,
			{ session: {} } as unknown as Request,
			'case-1',
			'353RK-4766',
			S62A_AUDIT_ACTIONS.REPRESENTATION_ADDED
		);

		const [[entry]] = recordMany.mock.calls[0].arguments;
		assert.strictEqual(entry.userId, UNKNOWN_AUDIT_USER_ID);
	});

	it('should not record anything when auditing is switched off', async () => {
		const { service, recordMany } = buildService({ isAuditLive: false });

		await recordS62aRepresentationAudit(service, req, 'case-1', '353RK-4766', S62A_AUDIT_ACTIONS.REPRESENTATION_ADDED);

		assert.strictEqual(recordMany.mock.callCount(), 0);
	});

	it('should log, not throw, if recording fails', async () => {
		const { service, recordMany, error } = buildService();
		recordMany.mock.mockImplementation(async () => {
			throw new Error('Audit unavailable');
		});

		await assert.doesNotReject(() =>
			recordS62aRepresentationAudit(service, req, 'case-1', '353RK-4766', S62A_AUDIT_ACTIONS.REPRESENTATION_ADDED)
		);
		assert.strictEqual(error.mock.callCount(), 1);
	});
});

describe('resolveRepresentationReviewAction', () => {
	const { AWAITING_REVIEW, ACCEPTED, REJECTED, WITHDRAWN } = REPRESENTATION_STATUS_ID;

	it('should record an approval when the status becomes accepted', () => {
		assert.strictEqual(
			resolveRepresentationReviewAction(AWAITING_REVIEW, ACCEPTED),
			S62A_AUDIT_ACTIONS.REPRESENTATION_APPROVED
		);
		assert.strictEqual(
			resolveRepresentationReviewAction(REJECTED, ACCEPTED),
			S62A_AUDIT_ACTIONS.REPRESENTATION_APPROVED
		);
	});

	it('should record a rejection when the status becomes rejected', () => {
		assert.strictEqual(
			resolveRepresentationReviewAction(AWAITING_REVIEW, REJECTED),
			S62A_AUDIT_ACTIONS.REPRESENTATION_REJECTED
		);
		assert.strictEqual(
			resolveRepresentationReviewAction(ACCEPTED, REJECTED),
			S62A_AUDIT_ACTIONS.REPRESENTATION_REJECTED
		);
	});

	it('should record nothing when the status has not changed', () => {
		assert.strictEqual(resolveRepresentationReviewAction(ACCEPTED, ACCEPTED), null);
		assert.strictEqual(resolveRepresentationReviewAction(REJECTED, REJECTED), null);
	});

	it('should still record the decision if the status before the review is unknown', () => {
		assert.strictEqual(
			resolveRepresentationReviewAction(undefined, ACCEPTED),
			S62A_AUDIT_ACTIONS.REPRESENTATION_APPROVED
		);
	});

	it('should record nothing without a decision, or for other statuses', () => {
		assert.strictEqual(resolveRepresentationReviewAction(AWAITING_REVIEW, undefined), null);
		assert.strictEqual(resolveRepresentationReviewAction(ACCEPTED, WITHDRAWN), null);
		assert.strictEqual(resolveRepresentationReviewAction(ACCEPTED, AWAITING_REVIEW), null);
	});
});

describe('recordS62aRepresentationUpdates', () => {
	const categoryChange = {
		caseId: 'case-1',
		representationReference: '353RK-4766',
		previous: { categoryId: REPRESENTATION_CATEGORY_ID.CONSULTEES },
		answers: { categoryId: REPRESENTATION_CATEGORY_ID.INTERESTED_PARTIES }
	};

	it('should record one entry for each changed field', async () => {
		const { service, recordMany } = buildService();

		await recordS62aRepresentationUpdates(service, req, categoryChange);

		assert.deepStrictEqual(recordMany.mock.calls[0].arguments, [
			[
				{
					caseId: 'case-1',
					userId: 'user-1',
					action: S62A_AUDIT_ACTIONS.REPRESENTATION_UPDATED,
					metadata: {
						fieldName: 'Representation type',
						reference: '353RK-4766',
						oldValue: 'Consultees',
						newValue: 'Interested party'
					}
				}
			],
			CASE_DATA_MODEL.S62A
		]);
	});

	it('should not record anything when nothing changed', async () => {
		const { service, recordMany } = buildService();

		await recordS62aRepresentationUpdates(service, req, {
			...categoryChange,
			answers: { categoryId: REPRESENTATION_CATEGORY_ID.CONSULTEES }
		});

		assert.strictEqual(recordMany.mock.callCount(), 0);
	});

	it('should not record anything when auditing is switched off', async () => {
		const { service, recordMany } = buildService({ isAuditLive: false });

		await recordS62aRepresentationUpdates(service, req, categoryChange);

		assert.strictEqual(recordMany.mock.callCount(), 0);
	});

	it('should log, not throw, if recording fails', async () => {
		const { service, recordMany, error } = buildService();
		recordMany.mock.mockImplementation(async () => {
			throw new Error('Audit unavailable');
		});

		await assert.doesNotReject(() => recordS62aRepresentationUpdates(service, req, categoryChange));
		assert.strictEqual(error.mock.callCount(), 1);
	});
});
