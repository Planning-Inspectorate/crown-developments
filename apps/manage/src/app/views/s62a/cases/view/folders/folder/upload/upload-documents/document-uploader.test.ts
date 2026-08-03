import { describe, it, mock } from 'node:test';
import assert from 'node:assert';
import type { PrismaClient } from '@pins/crowndev-database/src/client/client.ts';
import type { BlobStorageClient } from '@pins/crowndev-lib/blob-store/blob-store-client.ts';
import type { Logger } from 'pino';
import { DocumentsUploader } from './document-uploader.ts';
import type { FileValidator, ValidationConfig } from './file-validator.ts';
import {
	ALLOWED_EXTENSIONS,
	ALLOWED_EXTENSIONS_TEXT,
	ALLOWED_MIME_TYPES,
	FILE_NAME_MAX_LENGTH,
	FILE_NAMES_REGEX,
	MAX_FILE_SIZE,
	TOTAL_UPLOAD_LIMIT
} from '../upload-utils.ts';

const createMockFile = (name: string, size: number): Express.Multer.File =>
	({
		originalname: name,
		size,
		buffer: Buffer.from('mock-data'),
		mimetype: 'application/pdf'
	}) as Express.Multer.File;

const defaultConfig: ValidationConfig = {
	allowedExtensions: ALLOWED_EXTENSIONS,
	allowedMimeTypes: ALLOWED_MIME_TYPES,
	maxFileSize: MAX_FILE_SIZE,
	totalUploadLimit: TOTAL_UPLOAD_LIMIT,
	allowedExtensionsText: ALLOWED_EXTENSIONS_TEXT,
	fileNameRegex: FILE_NAMES_REGEX,
	maxFileNameLength: FILE_NAME_MAX_LENGTH
};

function setupMocks() {
	const mockFindMany = mock.fn(async (): Promise<any[]> => []);
	const mockFindFirst = mock.fn(async (): Promise<any> => null);
	const mockDraftCreate = mock.fn(async (args: any): Promise<any> => args.data);
	const mockDraftDelete = mock.fn(async (): Promise<any> => ({}));
	const mockDraftDeleteMany = mock.fn(async (): Promise<any> => ({ count: 1 }));
	const mockDocCreateMany = mock.fn(async (): Promise<any> => ({ count: 1 }));
	const mockTransaction = mock.fn(async (operations: any): Promise<any> => operations);

	const mockUploadStream = mock.fn(async (): Promise<void> => {});
	const mockDeleteBlobIfExists = mock.fn(async (): Promise<any> => ({ succeeded: true }));

	const mockInfo = mock.fn();
	const mockWarn = mock.fn();
	const mockError = mock.fn();

	const mockValidateSingleFile = mock.fn(async (): Promise<any[]> => []);

	const db = {
		draftDocument: {
			findMany: mockFindMany,
			findFirst: mockFindFirst,
			create: mockDraftCreate,
			delete: mockDraftDelete,
			deleteMany: mockDraftDeleteMany
		},
		document: {
			createMany: mockDocCreateMany
		},
		$transaction: mockTransaction
	} as unknown as PrismaClient;

	const blobStore = {
		uploadStream: mockUploadStream,
		deleteBlobIfExists: mockDeleteBlobIfExists
	} as unknown as BlobStorageClient;

	const logger = {
		info: mockInfo,
		warn: mockWarn,
		error: mockError
	} as unknown as Logger;

	const fileValidator = {
		validateSingleFile: mockValidateSingleFile
	} as unknown as FileValidator;

	const uploader = new DocumentsUploader(db, blobStore, logger, fileValidator);

	return {
		uploader,
		mocks: {
			mockFindMany,
			mockFindFirst,
			mockDraftDelete,
			mockTransaction,
			mockUploadStream,
			mockDeleteBlobIfExists,
			mockWarn,
			mockError,
			mockValidateSingleFile
		}
	};
}

describe('DocumentsUploader', () => {
	describe('validateUploadBatch()', () => {
		it('returns an empty array when files are valid, unique, and under the size limit', async () => {
			const { uploader } = setupMocks();
			const file = createMockFile('test.pdf', 500);

			const result = await uploader.validateUploadBatch('case-1', 'session-1', [file], defaultConfig);

			assert.deepStrictEqual(result, []);
		});

		it('returns validation errors from the fileValidator dependency', async () => {
			const { uploader, mocks } = setupMocks();
			const file = createMockFile('bad-file.exe', 500);

			mocks.mockValidateSingleFile.mock.mockImplementation(async () => [
				{ text: 'File type not allowed', href: '#upload-form' }
			]);

			const result = await uploader.validateUploadBatch('case-1', 'session-1', [file], defaultConfig);

			assert.strictEqual(result.length, 1);
			assert.strictEqual(result[0].text, 'File type not allowed');
		});

		it('adds an error when a duplicate file name already exists in drafts', async () => {
			const { uploader, mocks } = setupMocks();
			const file = createMockFile('duplicate.pdf', 500);

			mocks.mockFindMany.mock.mockImplementation(async () => [{ fileName: 'duplicate.pdf', size: BigInt(200) }]);

			const result = await uploader.validateUploadBatch('case-1', 'session-1', [file], defaultConfig);

			assert.strictEqual(result.length, 1);
			assert.strictEqual(result[0].text, 'A file with this name has already been uploaded');
		});

		it('adds an error when the combined size of existing drafts and new files exceeds the limit', async () => {
			const { uploader, mocks } = setupMocks();
			const file = createMockFile('huge.pdf', 800);

			mocks.mockFindMany.mock.mockImplementation(async () => [{ fileName: 'existing.pdf', size: BigInt(300) }]);

			const strictConfig = { ...defaultConfig, totalUploadLimit: 1000 };

			const result = await uploader.validateUploadBatch('case-1', 'session-1', [file], strictConfig);

			assert.strictEqual(result.length, 1);
			assert.ok(result[0].text.includes('Total file size of all attachments must not exceed'));
		});
	});

	describe('processAndDraftUploads()', () => {
		it('uploads files to blob storage and saves draft records', async () => {
			const { uploader, mocks } = setupMocks();
			const file1 = createMockFile('file1.pdf', 100);
			const file2 = createMockFile('file2.pdf', 200);

			await uploader.processAndDraftUploads('case-1', [file1, file2], 'session-1', 'folder-1');

			assert.strictEqual(mocks.mockUploadStream.mock.calls.length, 2);
			assert.ok((mocks?.mockUploadStream.mock?.calls[0]?.arguments as any)[2].startsWith('case-1/'));
			assert.strictEqual(mocks.mockTransaction.mock.calls.length, 1);
			const transactionOperations = mocks.mockTransaction.mock.calls[0].arguments[0];
			assert.strictEqual(transactionOperations.length, 2);
		});

		it('throws an error if a blob upload fails, stopping draft creation', async () => {
			const { uploader, mocks } = setupMocks();
			const file = createMockFile('test.pdf', 100);

			mocks.mockUploadStream.mock.mockImplementation(async () => {
				throw new Error('Azure timeout');
			});

			await assert.rejects(() => uploader.processAndDraftUploads('case-1', [file], 'session-1', 'folder-1'), {
				message: 'Failed to upload file'
			});

			assert.strictEqual(mocks.mockTransaction.mock.calls.length, 0);
		});
	});

	describe('commitDrafts()', () => {
		it('returns zero and does nothing if no drafts exist for the session', async () => {
			const { uploader, mocks } = setupMocks();

			const result = await uploader.commitDrafts('case-1', 'session-1');

			assert.deepStrictEqual(result, { createdLength: 0, fileNames: [] });
			assert.strictEqual(mocks.mockTransaction.mock.calls.length, 0);
		});

		it('moves drafts to permanent documents and deletes the drafts in a transaction', async () => {
			const { uploader, mocks } = setupMocks();

			mocks.mockFindMany.mock.mockImplementation(async () => [
				{ fileName: 'doc.pdf', blobName: 'path/1', size: BigInt(500), mimeType: 'application/pdf', folderId: 'f1' }
			]);

			const result = await uploader.commitDrafts('case-1', 'session-1');

			assert.strictEqual(result.createdLength, 1);
			assert.strictEqual(result.fileNames[0], 'doc.pdf');
			assert.strictEqual(mocks.mockTransaction.mock.calls.length, 1);
			assert.strictEqual(mocks.mockTransaction.mock.calls[0].arguments[0].length, 2);
		});
	});

	describe('deleteDraft()', () => {
		it('logs a warning and exits gracefully if the draft is not found', async () => {
			const { uploader, mocks } = setupMocks();

			await uploader.deleteDraft('draft-1', 'session-1');

			assert.strictEqual(mocks.mockWarn.mock.calls.length, 1);
			assert.strictEqual(mocks.mockDraftDelete.mock.calls.length, 0);
			assert.strictEqual(mocks.mockDeleteBlobIfExists.mock.calls.length, 0);
		});

		it('deletes the draft from the DB and the blob from storage when found', async () => {
			const { uploader, mocks } = setupMocks();

			mocks.mockFindFirst.mock.mockImplementation(async () => ({
				id: 'draft-1',
				blobName: 'case-1/blob-uuid'
			}));

			await uploader.deleteDraft('draft-1', 'session-1');

			assert.strictEqual(mocks.mockDraftDelete.mock.calls.length, 1);
			assert.strictEqual(mocks.mockDeleteBlobIfExists.mock.calls.length, 1);
			assert.strictEqual((mocks.mockDeleteBlobIfExists.mock.calls[0].arguments as any)[0], 'case-1/blob-uuid');
		});

		it('handles blob deletion failures silently without crashing', async () => {
			const { uploader, mocks } = setupMocks();

			mocks.mockFindFirst.mock.mockImplementation(async () => ({
				id: 'draft-1',
				blobName: 'case-1/blob-uuid'
			}));

			mocks.mockDeleteBlobIfExists.mock.mockImplementation(async () => {
				throw new Error('Blob store offline');
			});

			await uploader.deleteDraft('draft-1', 'session-1');

			assert.strictEqual(mocks.mockDraftDelete.mock.calls.length, 1);
			assert.strictEqual(mocks.mockError.mock.calls.length, 1);
		});
	});
});
