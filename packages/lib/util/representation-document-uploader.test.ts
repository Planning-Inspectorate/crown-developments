import { describe, it, mock } from 'node:test';
import assert from 'node:assert';
import type { PrismaClient } from '@pins/crowndev-database/src/client/client.ts';
import type { BlobStorageClient } from '@pins/crowndev-lib/blob-store/blob-store-client.ts';
import type { Logger } from 'pino';
import { RepresentationDocumentsUploader } from './representation-document-uploader.ts';
import type { FileValidator } from '@pins/crowndev-lib/validators/file-validator.ts';
import { REPRESENTATION_STATUS_ID } from '@pins/crowndev-database/src/seed/data-static.ts';
import 'multer';

const createMockFile = (name: string, size: number): Express.Multer.File =>
	({ originalname: name, size, buffer: Buffer.from('data'), mimetype: 'application/pdf' }) as Express.Multer.File;

function setupRepsMocks() {
	const mockFindMany = mock.fn(async (): Promise<any[]> => []);
	const mockFindFirst = mock.fn(async (): Promise<any> => null);
	const mockDraftDelete = mock.fn(async (): Promise<any> => ({}));
	const mockDraftCreate = mock.fn(async (args: any): Promise<any> => args);
	const mockTransaction = mock.fn(async (operations: any): Promise<any> => operations);
	const mockUploadStream = mock.fn(async (): Promise<void> => {});
	const mockDeleteBlobIfExists = mock.fn(async (): Promise<any> => ({ succeeded: true }));

	const db = {
		draftBlobRepresentationDocument: {
			findMany: mockFindMany,
			findFirst: mockFindFirst,
			create: mockDraftCreate,
			delete: mockDraftDelete
		},
		$transaction: mockTransaction
	} as unknown as PrismaClient;

	const uploader = new RepresentationDocumentsUploader(
		db,
		{ uploadStream: mockUploadStream, deleteBlobIfExists: mockDeleteBlobIfExists } as unknown as BlobStorageClient,
		{ info: mock.fn(), warn: mock.fn(), error: mock.fn() } as unknown as Logger,
		{ validateSingleFile: mock.fn(async () => []) } as unknown as FileValidator
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
			mockDeleteBlobIfExists
		}
	};
}

describe('RepresentationDocumentsUploader', () => {
	describe('validateUploadBatch()', () => {
		it('queries existing representation drafts correctly before validating', async () => {
			const { uploader, mocks } = setupRepsMocks();
			await uploader.validateUploadBatch('session-1', [], {} as any);
			assert.strictEqual(mocks.mockFindMany.mock.calls.length, 1);
			assert.deepStrictEqual(mocks?.mockFindMany?.mock?.calls[0].arguments[0].where, { sessionKey: 'session-1' });
		});
	});

	describe('processAndDraftUploads()', () => {
		it('formats representation files, uses correct blob path, and saves drafts', async () => {
			const { uploader, mocks } = setupRepsMocks();
			await uploader.processAndDraftUploads('case-1', [createMockFile('f.pdf', 100)], 'session-1');

			assert.strictEqual(mocks.mockUploadStream.mock.calls.length, 1);
			assert.ok((mocks.mockUploadStream.mock.calls[0].arguments as any)[2].startsWith('case-1/representations/'));

			assert.strictEqual(mocks.mockTransaction.mock.calls.length, 1);

			const createOperationArgs = mocks.mockDraftCreate.mock.calls[0].arguments[0];
			assert.strictEqual(createOperationArgs.data.statusId, REPRESENTATION_STATUS_ID.AWAITING_REVIEW);
		});
	});

	describe('deleteDraft()', () => {
		it('deletes representation draft and triggers blob deletion if found', async () => {
			const { uploader, mocks } = setupRepsMocks();
			mocks.mockFindFirst.mock.mockImplementation(async () => ({ id: 'draft-1', blobName: 'rep-blob-uuid' }));
			await uploader.deleteDraft('draft-1', 'session-1');

			assert.strictEqual(mocks.mockDraftDelete.mock.calls.length, 1);
			assert.strictEqual(mocks.mockDeleteBlobIfExists.mock.calls.length, 1);
			assert.strictEqual((mocks.mockDeleteBlobIfExists.mock.calls[0].arguments as any)[0], 'rep-blob-uuid');
		});

		it('does nothing if representation draft is not found', async () => {
			const { uploader, mocks } = setupRepsMocks();
			await uploader.deleteDraft('missing-draft', 'session-1');

			assert.strictEqual(mocks.mockDraftDelete.mock.calls.length, 0);
			assert.strictEqual(mocks.mockDeleteBlobIfExists.mock.calls.length, 0);
		});
	});
});
