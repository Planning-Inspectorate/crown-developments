import { describe, it, mock, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { buildUpdateRepresentation } from './controller.ts';
import type { Logger } from 'pino';
import type { Request, Response } from 'express';
import type { ManageService } from '#service';
import type { SaveParams } from '@planning-inspectorate/dynamic-forms';
import { CASE_DATA_MODEL } from '@pins/crowndev-lib/util/types.ts';
import { S62A_AUDIT_ACTIONS } from '../../../audit/actions.ts';
import { REPRESENTATION_CATEGORY_ID } from '@pins/crowndev-database/src/seed/data-static.ts';

describe('buildUpdateRepresentation', () => {
	const infoMock = mock.fn();
	const errorMock = mock.fn();
	const warnMock = mock.fn();

	const mockLogger = {
		info: infoMock,
		error: errorMock,
		warn: warnMock
	} as unknown as Logger;

	const findUniqueTxMock = mock.fn();
	const findManyDraftMock = mock.fn();
	const deleteManyDraftMock = mock.fn();
	const createManyBlobMock = mock.fn();

	const findManyWithdrawalDraftMock = mock.fn();
	const deleteManyWithdrawalDraftMock = mock.fn();
	const createManyWithdrawalBlobMock = mock.fn();

	const mockTx = {
		s62aRepresentation: { findUnique: findUniqueTxMock },
		draftBlobRepresentationDocument: { findMany: findManyDraftMock, deleteMany: deleteManyDraftMock },
		blobRepresentationDocument: { createMany: createManyBlobMock },
		draftBlobWithdrawalRequestDocument: {
			findMany: findManyWithdrawalDraftMock,
			deleteMany: deleteManyWithdrawalDraftMock
		},
		blobWithdrawalRequestDocument: { createMany: createManyWithdrawalBlobMock }
	};

	const transactionMock = mock.fn(async (callback: (tx: typeof mockTx) => Promise<void>) => callback(mockTx));
	const updateMock = mock.fn();

	const mockDb = {
		$transaction: transactionMock,
		s62aRepresentation: { update: updateMock }
	} as unknown as ManageService['db'];

	const mockRes = (): Response => {
		const statusMock = mock.fn();
		const res = {
			render: mock.fn(),
			status: statusMock,
			send: mock.fn(),
			locals: {
				originalAnswers: { existingField: 'oldValue' }
			}
		} as unknown as Response;
		statusMock.mock.mockImplementation(() => res as unknown as undefined);
		return res;
	};

	const mockReq = (overrides: Record<string, unknown> = {}): Request =>
		({
			params: {
				id: 'case-123',
				representationRef: 'REP-001',
				question: 'some-question'
			},
			session: {},
			...overrides
		}) as unknown as Request;

	const service = { db: mockDb, logger: mockLogger } as unknown as ManageService;

	beforeEach(() => {
		transactionMock.mock.resetCalls();
		updateMock.mock.resetCalls();

		findUniqueTxMock.mock.resetCalls();

		findManyDraftMock.mock.resetCalls();
		deleteManyDraftMock.mock.resetCalls();
		createManyBlobMock.mock.resetCalls();

		findManyWithdrawalDraftMock.mock.resetCalls();
		deleteManyWithdrawalDraftMock.mock.resetCalls();
		createManyWithdrawalBlobMock.mock.resetCalls();

		infoMock.mock.resetCalls();
		errorMock.mock.resetCalls();
	});

	describe('Early Exits', () => {
		it('should return early and do nothing if no answers are provided', async () => {
			const req = mockReq();
			const res = mockRes();
			const data = { answers: {} };

			const handler = buildUpdateRepresentation(service);
			await handler({ req, res, data } as unknown as SaveParams);

			assert.strictEqual(infoMock.mock.callCount(), 1);
			assert.deepStrictEqual(infoMock.mock.calls[0].arguments[0], { id: 'case-123', representationRef: 'REP-001' });
			assert.strictEqual(transactionMock.mock.callCount(), 0);
			assert.strictEqual(updateMock.mock.callCount(), 0);
		});
	});

	describe('Without Attachments', () => {
		it('should update representation and set session data when no attachments are present', async () => {
			const req = mockReq();
			const res = mockRes();
			const data = { answers: { representedName: 'John Doe' } };

			const handler = buildUpdateRepresentation(service);
			await handler({ req, res, data } as unknown as SaveParams);

			assert.strictEqual(transactionMock.mock.callCount(), 0);

			assert.strictEqual(updateMock.mock.callCount(), 1);
			const updateArgs = updateMock.mock.calls[0].arguments[0] as { where: { reference: string } };
			assert.strictEqual(updateArgs.where.reference, 'REP-001');

			assert.ok(req.session);
		});
	});

	describe('With Attachments and Withdrawals', () => {
		it('should process submitterBlobAttachments via transaction correctly', async () => {
			const req = mockReq();
			const res = mockRes();
			const data = {
				answers: {
					representedName: 'Jane Doe',
					submitterBlobAttachments: [{ fileName: 'doc.pdf', itemId: 'doc-123' }]
				}
			};

			findUniqueTxMock.mock.mockImplementation(
				() => Promise.resolve({ id: 'rep-internal-id' }) as unknown as undefined
			);
			findManyDraftMock.mock.mockImplementation(
				() => Promise.resolve([{ id: 'doc-123', fileName: 'doc.pdf', blobName: 'blob-uri' }]) as unknown as undefined
			);

			const handler = buildUpdateRepresentation(service);
			await handler({ req, res, data } as unknown as SaveParams);

			assert.strictEqual(transactionMock.mock.callCount(), 1);

			assert.strictEqual(createManyBlobMock.mock.callCount(), 1);
			const createArgs = createManyBlobMock.mock.calls[0].arguments[0] as {
				data: Array<{ fileName: string; s62aRepresentationId: string }>;
			};
			assert.strictEqual(createArgs.data[0].fileName, 'doc.pdf');
			assert.strictEqual(createArgs.data[0].s62aRepresentationId, 'rep-internal-id');

			assert.strictEqual(deleteManyDraftMock.mock.callCount(), 1);
			const deleteArgs = deleteManyDraftMock.mock.calls[0].arguments[0] as { where: { id: { in: string[] } } };
			assert.deepStrictEqual(deleteArgs.where.id.in, ['doc-123']);

			assert.strictEqual(createManyWithdrawalBlobMock.mock.callCount(), 0);

			assert.strictEqual(updateMock.mock.callCount(), 1);
		});

		it('should process ajaxWithdrawalRequests via transaction correctly when no other attachments exist', async () => {
			const req = mockReq();
			const res = mockRes();
			const data = {
				answers: {
					representedName: 'Jane Doe',
					ajaxWithdrawalRequests: [{ fileName: 'withdraw.pdf', itemId: 'wd-123' }]
				}
			};

			findUniqueTxMock.mock.mockImplementation(
				() => Promise.resolve({ id: 'rep-internal-id' }) as unknown as undefined
			);
			findManyWithdrawalDraftMock.mock.mockImplementation(
				() =>
					Promise.resolve([{ id: 'wd-123', fileName: 'withdraw.pdf', blobName: 'blob-uri' }]) as unknown as undefined
			);

			const handler = buildUpdateRepresentation(service);
			await handler({ req, res, data } as unknown as SaveParams);

			assert.strictEqual(transactionMock.mock.callCount(), 1);

			assert.strictEqual(createManyBlobMock.mock.callCount(), 0);

			assert.strictEqual(createManyWithdrawalBlobMock.mock.callCount(), 1);
			const createArgs = createManyWithdrawalBlobMock.mock.calls[0].arguments[0] as {
				data: Array<{ fileName: string; s62aRepresentationId: string }>;
			};
			assert.strictEqual(createArgs.data[0].fileName, 'withdraw.pdf');
			assert.strictEqual(createArgs.data[0].s62aRepresentationId, 'rep-internal-id');

			assert.strictEqual(deleteManyWithdrawalDraftMock.mock.callCount(), 1);
			const deleteArgs = deleteManyWithdrawalDraftMock.mock.calls[0].arguments[0] as {
				where: { id: { in: string[] } };
			};
			assert.deepStrictEqual(deleteArgs.where.id.in, ['wd-123']);

			assert.strictEqual(updateMock.mock.callCount(), 1);
		});

		it('should process BOTH representation attachments and withdrawal requests in the same transaction', async () => {
			const req = mockReq();
			const res = mockRes();
			const data = {
				answers: {
					myselfBlobAttachments: [{ fileName: 'doc.pdf', itemId: 'doc-123' }],
					ajaxWithdrawalRequests: [{ fileName: 'withdraw.pdf', itemId: 'wd-123' }]
				}
			};

			findUniqueTxMock.mock.mockImplementation(
				() => Promise.resolve({ id: 'rep-internal-id' }) as unknown as undefined
			);
			findManyDraftMock.mock.mockImplementation(
				() => Promise.resolve([{ id: 'doc-123', fileName: 'doc.pdf', blobName: 'blob-uri' }]) as unknown as undefined
			);
			findManyWithdrawalDraftMock.mock.mockImplementation(
				() =>
					Promise.resolve([{ id: 'wd-123', fileName: 'withdraw.pdf', blobName: 'blob-uri' }]) as unknown as undefined
			);

			const handler = buildUpdateRepresentation(service);
			await handler({ req, res, data } as unknown as SaveParams);

			assert.strictEqual(transactionMock.mock.callCount(), 1);

			assert.strictEqual(createManyBlobMock.mock.callCount(), 1);
			assert.strictEqual(createManyWithdrawalBlobMock.mock.callCount(), 1);

			assert.strictEqual(deleteManyDraftMock.mock.callCount(), 1);
			assert.strictEqual(deleteManyWithdrawalDraftMock.mock.callCount(), 1);
		});

		it('should trigger notFound logic if representation is not found inside the transaction', async () => {
			const req = mockReq();
			const res = mockRes();
			const data = {
				answers: {
					myselfBlobAttachments: [{ fileName: 'doc.pdf', itemId: 'doc-123' }]
				}
			};

			findUniqueTxMock.mock.mockImplementation(() => Promise.resolve(null) as unknown as undefined);

			const handler = buildUpdateRepresentation(service);
			await handler({ req, res, data } as unknown as SaveParams);

			assert.strictEqual(createManyBlobMock.mock.callCount(), 0);
			assert.strictEqual(deleteManyDraftMock.mock.callCount(), 0);
			assert.strictEqual(createManyWithdrawalBlobMock.mock.callCount(), 0);
		});
	});

	describe('Error Handling', () => {
		it('should handle errors thrown during the main representation update', async () => {
			const req = mockReq();
			const res = mockRes();
			const data = { answers: { field: 'value' } };

			const dbError = new Error('Database disconnected');
			updateMock.mock.mockImplementation(() => Promise.reject(dbError) as unknown as undefined);

			const handler = buildUpdateRepresentation(service);

			try {
				await handler({ req, res, data } as unknown as SaveParams);
			} catch (err: unknown) {
				assert.ok(err);
			}

			assert.strictEqual(updateMock.mock.callCount(), 1);
		});
	});

	describe('Case history', () => {
		function withAudit() {
			const recordMany = mock.fn(async () => {});
			const auditedService = { ...service, audit: { recordMany } } as unknown as ManageService;
			const req = mockReq({ session: { account: { localAccountId: 'user-1' } } });
			const res = {
				locals: {
					originalAnswers: { categoryId: REPRESENTATION_CATEGORY_ID.CONSULTEES },
					fieldDisplayNames: { categoryId: 'Representation type' }
				}
			} as unknown as Response;
			const data = { answers: { categoryId: REPRESENTATION_CATEGORY_ID.INTERESTED_PARTIES } };

			return { handler: buildUpdateRepresentation(auditedService), req, res, data, recordMany };
		}

		it('should record the changed fields after the update', async () => {
			const { handler, req, res, data, recordMany } = withAudit();
			updateMock.mock.mockImplementation(() => Promise.resolve() as unknown as undefined);

			await handler({ req, res, data } as unknown as SaveParams);

			assert.deepStrictEqual((recordMany.mock.calls[0] as any).arguments, [
				[
					{
						caseId: 'case-123',
						userId: 'user-1',
						action: S62A_AUDIT_ACTIONS.REPRESENTATION_UPDATED,
						metadata: {
							fieldName: 'Representation type',
							reference: 'REP-001',
							oldValue: 'Consultees',
							newValue: 'Interested party'
						}
					}
				],
				CASE_DATA_MODEL.S62A
			]);
		});

		it('should not record anything if the update fails', async () => {
			const { handler, req, res, data, recordMany } = withAudit();
			updateMock.mock.mockImplementation(
				() => Promise.reject(new Error('Database disconnected')) as unknown as undefined
			);

			await assert.rejects(() => handler({ req, res, data } as unknown as SaveParams));
			assert.strictEqual(recordMany.mock.callCount(), 0);
		});
	});
});
