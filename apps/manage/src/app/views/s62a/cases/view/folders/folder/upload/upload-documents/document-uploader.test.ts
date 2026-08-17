import { describe, it, mock } from 'node:test';
import assert from 'node:assert';
import type { PrismaClient } from '@pins/crowndev-database/src/client/client.ts';
import type { BlobStorageClient } from '@pins/crowndev-lib/blob-store/blob-store-client.ts';
import type { Logger } from 'pino';
import { DocumentsUploader } from './document-uploader.ts';
import type { FileValidator } from '@pins/crowndev-lib/validators/file-validator.ts';
import 'multer';

const createMockFile = (name: string, size: number): Express.Multer.File =>
	({ originalname: name, size, buffer: Buffer.from('data'), mimetype: 'application/pdf' }) as Express.Multer.File;

function setupDocsMocks() {
	const mockFindMany = mock.fn(async (): Promise<any[]> => []);
	const mockFindFirst = mock.fn(async (): Promise<any> => null);
	const mockDraftDelete = mock.fn(async (): Promise<any> => ({}));
	const mockTransaction = mock.fn(async (operations: any): Promise<any> => operations);
	const mockUploadStream = mock.fn(async (): Promise<void> => {});
	const mockDeleteBlobIfExists = mock.fn(async (): Promise<any> => ({ succeeded: true }));

	const db = {
		draftDocument: {
			findMany: mockFindMany,
			findFirst: mockFindFirst,
			create: mock.fn(),
			delete: mockDraftDelete,
			deleteMany: mock.fn()
		},
		document: { createMany: mock.fn() },
		$transaction: mockTransaction
	} as unknown as PrismaClient;

	const uploader = new DocumentsUploader(
		db,
		{ uploadStream: mockUploadStream, deleteBlobIfExists: mockDeleteBlobIfExists } as unknown as BlobStorageClient,
		{ info: mock.fn(), warn: mock.fn(), error: mock.fn() } as unknown as Logger,
		{ validateSingleFile: mock.fn(async () => []) } as unknown as FileValidator
	);

	return {
		uploader,
		mocks: { mockFindMany, mockFindFirst, mockDraftDelete, mockTransaction, mockUploadStream, mockDeleteBlobIfExists }
	};
}

describe('DocumentsUploader', () => {
	describe('validateUploadBatch()', () => {
		it('queries existing drafts correctly before validating', async () => {
			const { uploader, mocks } = setupDocsMocks();
			await uploader.validateUploadBatch('case-1', 'session-1', [], {} as any);
			assert.strictEqual(mocks.mockFindMany.mock.calls.length, 1);
			assert.deepStrictEqual(mocks.mockFindMany.mock.calls[0].arguments[0].where, {
				sessionKey: 'session-1',
				s62aCaseId: 'case-1'
			});
		});
	});

	describe('processAndDraftUploads()', () => {
		it('formats files and saves draft records via transaction', async () => {
			const { uploader, mocks } = setupDocsMocks();
			await uploader.processAndDraftUploads('case-1', [createMockFile('f.pdf', 100)], 'session-1', 'folder-1');
			assert.strictEqual(mocks.mockUploadStream.mock.calls.length, 1);
			assert.ok((mocks.mockUploadStream.mock.calls[0].arguments as any)[2].startsWith('case-1/'));
			assert.strictEqual(mocks.mockTransaction.mock.calls.length, 1);
		});
	});

	describe('commitDrafts()', () => {
		it('returns zero and does nothing if no drafts exist', async () => {
			const { uploader, mocks } = setupDocsMocks();
			const result = await uploader.commitDrafts('case-1', 'session-1');
			assert.deepStrictEqual(result, { createdLength: 0, fileNames: [] });
			assert.strictEqual(mocks.mockTransaction.mock.calls.length, 0);
		});

		it('moves drafts to documents and deletes drafts in a transaction', async () => {
			const { uploader, mocks } = setupDocsMocks();
			mocks.mockFindMany.mock.mockImplementation(async () => [
				{ fileName: 'doc.pdf', blobName: 'path/1', size: BigInt(500), mimeType: 'application/pdf', folderId: 'f1' }
			]);
			const result = await uploader.commitDrafts('case-1', 'session-1');
			assert.strictEqual(result.createdLength, 1);
			assert.strictEqual(mocks.mockTransaction.mock.calls.length, 1);
		});
	});

	describe('deleteDraft()', () => {
		it('deletes draft and triggers blob deletion if found', async () => {
			const { uploader, mocks } = setupDocsMocks();
			mocks.mockFindFirst.mock.mockImplementation(async () => ({ id: 'draft-1', blobName: 'blob-uuid' }));
			await uploader.deleteDraft('draft-1', 'session-1');
			assert.strictEqual(mocks.mockDraftDelete.mock.calls.length, 1);
			assert.strictEqual(mocks.mockDeleteBlobIfExists.mock.calls.length, 1);
		});
	});
});
