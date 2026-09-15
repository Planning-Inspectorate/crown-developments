import { describe, it, mock } from 'node:test';
import assert from 'node:assert';
import type { PrismaClient } from '@pins/crowndev-database/src/client/client.ts';
import type { BlobStorageClient } from '@pins/crowndev-lib/blob-store/blob-store-client.ts';
import type { Logger } from 'pino';
import { RedactedAttachmentUploader } from './redacted-attachment-document-uploader.ts';
import type { FileValidator } from '@pins/crowndev-lib/validators/file-validator.ts';
import { REPRESENTATION_STATUS_ID } from '@pins/crowndev-database/src/seed/data-static.ts';
import 'multer';

const createMockFile = (name: string, size: number): Express.Multer.File =>
	({ originalname: name, size, buffer: Buffer.from('data'), mimetype: 'application/pdf' }) as Express.Multer.File;

function setupRedactedMocks() {
	const mockFindMany = mock.fn(async (..._args: any[]): Promise<any[]> => []);
	const mockFindFirst = mock.fn(async (..._args: any[]): Promise<any> => null);
	const mockDraftDelete = mock.fn(async (..._args: any[]): Promise<any> => ({}));
	const mockDraftCreate = mock.fn(async (..._args: any[]): Promise<any> => _args[0]);
	const mockTransaction = mock.fn(async (..._args: any[]): Promise<any> => _args[0]);
	const mockUploadStream = mock.fn(async (..._args: any[]): Promise<void> => {});
	const mockDeleteBlobIfExists = mock.fn(async (..._args: any[]): Promise<any> => ({ succeeded: true }));
	const mockLoggerWarn = mock.fn((..._args: any[]) => {});

	const db = {
		draftBlobRepresentationDocument: {
			findMany: mockFindMany,
			findFirst: mockFindFirst,
			create: mockDraftCreate,
			delete: mockDraftDelete
		},
		$transaction: mockTransaction
	} as unknown as PrismaClient;

	const uploader = new RedactedAttachmentUploader(
		db,
		{ uploadStream: mockUploadStream, deleteBlobIfExists: mockDeleteBlobIfExists } as unknown as BlobStorageClient,
		{ info: mock.fn(), warn: mockLoggerWarn, error: mock.fn() } as unknown as Logger,
		{
			validateSingleFile: mock.fn(async () => []),
			validateFileCount: mock.fn(() => []),
			validateDuplicateFiles: mock.fn(() => [])
		} as unknown as FileValidator
	);

	return {
		uploader,
		mocks: {
			mockFindMany,
			mockFindFirst,
			mockDraftCreate,
			mockDraftDelete,
			mockTransaction,
			mockUploadStream,
			mockDeleteBlobIfExists,
			mockLoggerWarn
		}
	};
}

describe('RedactedAttachmentUploader', () => {
	describe('validateUploadBatch()', () => {
		it('queries existing representation drafts correctly before validating', async () => {
			const { uploader, mocks } = setupRedactedMocks();
			await uploader.validateUploadBatch('session-1', [], {} as any);

			assert.strictEqual(mocks.mockFindMany.mock.calls.length, 1);

			const findManyArgs = mocks.mockFindMany.mock.calls[0].arguments[0] as {
				where: { sessionKey: string };
				select: { size: boolean; fileName: boolean };
			};

			assert.deepStrictEqual(findManyArgs.where, { sessionKey: 'session-1' });
			assert.deepStrictEqual(findManyArgs.select, { size: true, fileName: true });
		});
	});

	describe('processAndDraftUploads()', () => {
		it('formats representation files, uses correct blob path, assigns targetDocumentId, and saves drafts', async () => {
			const { uploader, mocks } = setupRedactedMocks();
			await uploader.processAndDraftUploads('case-1', [createMockFile('f.pdf', 100)], 'session-1', 'target-doc-1');

			assert.strictEqual(mocks.mockUploadStream.mock.calls.length, 1);

			const uploadArgs = mocks.mockUploadStream.mock.calls[0].arguments;
			assert.ok(String(uploadArgs[2]).startsWith('case-1/representations/'));

			assert.strictEqual(mocks.mockTransaction.mock.calls.length, 1);

			const createOperationArgs = mocks.mockDraftCreate.mock.calls[0].arguments[0] as {
				data: {
					statusId: number;
					targetDocumentId: string;
					sessionKey: string;
					size: bigint;
				};
			};

			assert.strictEqual(createOperationArgs.data.statusId, REPRESENTATION_STATUS_ID.AWAITING_REVIEW);
			assert.strictEqual(createOperationArgs.data.targetDocumentId, 'target-doc-1');
			assert.strictEqual(createOperationArgs.data.sessionKey, 'session-1');
			assert.strictEqual(createOperationArgs.data.size, BigInt(100));
		});
	});

	describe('deleteDraft()', () => {
		it('deletes representation draft by targetDocumentId and triggers blob deletion if found', async () => {
			const { uploader, mocks } = setupRedactedMocks();
			mocks.mockFindFirst.mock.mockImplementation(async () => ({
				id: 'draft-1',
				blobName: 'rep-blob-uuid',
				targetDocumentId: 'target-doc-1'
			}));

			const result = await uploader.deleteDraft('target-doc-1', 'session-1');

			assert.strictEqual(mocks.mockFindFirst.mock.calls.length, 1);

			const findFirstArgs = mocks.mockFindFirst.mock.calls[0].arguments[0] as {
				where: { targetDocumentId: string; sessionKey: string };
			};
			assert.deepStrictEqual(findFirstArgs.where, { targetDocumentId: 'target-doc-1', sessionKey: 'session-1' });

			assert.strictEqual(mocks.mockDraftDelete.mock.calls.length, 1);
			const draftDeleteArgs = mocks.mockDraftDelete.mock.calls[0].arguments[0] as { where: { id: string } };
			assert.deepStrictEqual(draftDeleteArgs.where, { id: 'draft-1' });

			assert.strictEqual(mocks.mockDeleteBlobIfExists.mock.calls.length, 1);
			const deleteBlobArgs = mocks.mockDeleteBlobIfExists.mock.calls[0].arguments;
			assert.strictEqual(deleteBlobArgs[0], 'rep-blob-uuid');

			assert.strictEqual(result, 'rep-blob-uuid');
		});

		it('does nothing and logs a warning if representation draft is not found', async () => {
			const { uploader, mocks } = setupRedactedMocks();

			const result = await uploader.deleteDraft('missing-doc-id', 'session-1');

			assert.strictEqual(mocks.mockLoggerWarn.mock.calls.length, 1);
			assert.strictEqual(mocks.mockDraftDelete.mock.calls.length, 0);
			assert.strictEqual(mocks.mockDeleteBlobIfExists.mock.calls.length, 0);
			assert.strictEqual(result, undefined);
		});
	});
});
