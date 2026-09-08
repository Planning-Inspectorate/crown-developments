import { describe, it, mock, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { buildUpdateRepresentation } from './controller.ts';
import type { Logger } from 'pino';
import type { Request, Response } from 'express';
import type { ManageService } from '#service';
import type { SaveParams } from '@planning-inspectorate/dynamic-forms';

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

	const mockTx = {
		s62aRepresentation: { findUnique: findUniqueTxMock },
		draftBlobRepresentationDocument: { findMany: findManyDraftMock, deleteMany: deleteManyDraftMock },
		blobRepresentationDocument: { createMany: createManyBlobMock }
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

	describe('With Attachments', () => {
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

			assert.strictEqual(updateMock.mock.callCount(), 1);
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
});
