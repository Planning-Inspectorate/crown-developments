import { describe, it, mock } from 'node:test';
import assert from 'node:assert/strict';
import type { PrismaClient } from '@pins/crowndev-database/src/client/client.ts';
import type { BlobStorageClient } from '@pins/crowndev-lib/blob-store/blob-store-client.ts';
import type { Logger } from 'pino';
import { WithdrawalRequestDocumentsUploader } from './withdrawal-request-documents-uploader.ts';
import type { FileValidator } from '@pins/crowndev-lib/validators/file-validator.ts';
import 'multer';

const createMockFile = (name: string, size: number): Express.Multer.File =>
	({ originalname: name, size, buffer: Buffer.from('data'), mimetype: 'application/pdf' }) as Express.Multer.File;

function setupWithdrawalMocks() {
	const mockRepFindUnique = mock.fn(async (): Promise<any> => ({ id: 'rep-internal-id' }));

	const mockFindMany = mock.fn(async (): Promise<any[]> => []);
	const mockFindFirst = mock.fn(async (): Promise<any> => null);
	const mockDraftDelete = mock.fn(async (): Promise<any> => ({}));
	const mockDraftCreate = mock.fn(async (args: any): Promise<any> => args);
	const mockTransaction = mock.fn(async (operations: any): Promise<any> => operations);

	const mockUploadStream = mock.fn(async (): Promise<void> => {});
	const mockDeleteBlobIfExists = mock.fn(async (): Promise<any> => ({ succeeded: true }));

	const db = {
		s62aRepresentation: {
			findUnique: mockRepFindUnique
		},
		draftBlobWithdrawalRequestDocument: {
			findMany: mockFindMany,
			findFirst: mockFindFirst,
			create: mockDraftCreate,
			delete: mockDraftDelete
		},
		$transaction: mockTransaction
	} as unknown as PrismaClient;

	const logger = { info: mock.fn(), warn: mock.fn(), error: mock.fn() } as unknown as Logger;

	const uploader = new WithdrawalRequestDocumentsUploader(
		db,
		{ uploadStream: mockUploadStream, deleteBlobIfExists: mockDeleteBlobIfExists } as unknown as BlobStorageClient,
		logger,
		{ validateSingleFile: mock.fn(async () => []) } as unknown as FileValidator
	);

	return {
		uploader,
		mocks: {
			mockRepFindUnique,
			mockFindMany,
			mockFindFirst,
			mockDraftCreate,
			mockDraftDelete,
			mockTransaction,
			mockUploadStream,
			mockDeleteBlobIfExists,
			logger
		}
	};
}

describe('WithdrawalRequestDocumentsUploader', () => {
	describe('validateUploadBatch()', () => {
		it('queries existing withdrawal drafts correctly using sessionKey and representationRef', async () => {
			const { uploader, mocks } = setupWithdrawalMocks();
			await uploader.validateUploadBatch('session-1', 'REP-001', [], {} as any);

			assert.strictEqual(mocks.mockFindMany.mock.calls.length, 1);
			assert.deepStrictEqual((mocks.mockFindMany.mock.calls[0].arguments as any)[0].where, {
				sessionKey: 'session-1',
				S62aRepresentation: {
					reference: 'REP-001'
				}
			});
		});
	});

	describe('processAndDraftUploads()', () => {
		it('returns undefined and logs a warning if the representation cannot be found', async () => {
			const { uploader, mocks } = setupWithdrawalMocks();
			mocks.mockRepFindUnique.mock.mockImplementation(async () => null);

			const result = await uploader.processAndDraftUploads(
				'case-1',
				'REP-001',
				[createMockFile('f.pdf', 100)],
				'session-1'
			);

			assert.strictEqual(result, undefined);
			assert.strictEqual((mocks.logger.warn as any).mock.calls.length, 1);
			assert.strictEqual(mocks.mockUploadStream.mock.calls.length, 0);
		});

		it('formats withdrawal files, uses correct blob path, and saves drafts via transaction', async () => {
			const { uploader, mocks } = setupWithdrawalMocks();
			await uploader.processAndDraftUploads('case-1', 'REP-001', [createMockFile('f.pdf', 100)], 'session-1');

			assert.strictEqual(mocks.mockUploadStream.mock.calls.length, 1);
			const blobPath = (mocks.mockUploadStream.mock.calls[0].arguments as any)[2];
			assert.ok(blobPath.startsWith('case-1/representations/withdrawal/'));

			assert.strictEqual(mocks.mockTransaction.mock.calls.length, 1);
			const createOperationArgs = mocks.mockDraftCreate.mock.calls[0].arguments[0];

			assert.strictEqual(createOperationArgs.data.s62aRepresentationId, 'rep-internal-id');
			assert.strictEqual(createOperationArgs.data.sessionKey, 'session-1');
			assert.strictEqual(createOperationArgs.data.fileName, 'f.pdf');
		});
	});

	describe('deleteDraft()', () => {
		it('does nothing if the representation is not found', async () => {
			const { uploader, mocks } = setupWithdrawalMocks();
			mocks.mockRepFindUnique.mock.mockImplementation(async () => null);

			await uploader.deleteDraft('draft-1', 'REP-001', 'session-1');

			assert.strictEqual(mocks.mockDraftDelete.mock.calls.length, 0);
			assert.strictEqual(mocks.mockDeleteBlobIfExists.mock.calls.length, 0);
			assert.strictEqual((mocks.logger.warn as any).mock.calls.length, 1);
		});

		it('does nothing if the withdrawal draft is not found', async () => {
			const { uploader, mocks } = setupWithdrawalMocks();

			await uploader.deleteDraft('missing-draft', 'REP-001', 'session-1');

			assert.strictEqual(mocks.mockDraftDelete.mock.calls.length, 0);
			assert.strictEqual(mocks.mockDeleteBlobIfExists.mock.calls.length, 0);
			assert.strictEqual((mocks.logger.warn as any).mock.calls.length, 1);
		});

		it('deletes withdrawal draft and triggers blob deletion if found', async () => {
			const { uploader, mocks } = setupWithdrawalMocks();
			mocks.mockFindFirst.mock.mockImplementation(async () => ({ id: 'draft-1', blobName: 'withdraw-blob-uuid' }));

			await uploader.deleteDraft('draft-1', 'REP-001', 'session-1');

			assert.strictEqual(mocks.mockDraftDelete.mock.calls.length, 1);
			assert.deepStrictEqual((mocks.mockDraftDelete.mock.calls[0].arguments as any)[0].where, { id: 'draft-1' });

			assert.strictEqual(mocks.mockDeleteBlobIfExists.mock.calls.length, 1);
			assert.strictEqual((mocks.mockDeleteBlobIfExists.mock.calls[0].arguments as any)[0], 'withdraw-blob-uuid');
		});
	});
});
