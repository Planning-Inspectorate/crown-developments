import { describe, it, mock } from 'node:test';
import assert from 'node:assert';
import type { PrismaClient } from '@pins/crowndev-database/src/client/client.ts';
import type { BlobStorageClient } from '@pins/crowndev-lib/blob-store/blob-store-client.ts';
import type { Logger } from 'pino';
import type { FileValidator, ValidationConfig } from '../validators/file-validator.ts';
import { BaseDocumentsUploader, type FileWithId } from './base-document-uploader.ts';
import 'multer';

const createMockFile = (name: string, size: number): Express.Multer.File =>
	({ originalname: name, size, buffer: Buffer.from('mock-data'), mimetype: 'application/pdf' }) as Express.Multer.File;

const mockConfig: ValidationConfig = {
	allowedExtensions: ['pdf', 'doc', 'docx'],
	allowedMimeTypes: ['application/pdf', 'application/msword'],
	maxFileSize: 5000,
	totalUploadLimit: 10000,
	allowedExtensionsText: 'PDF, DOC, DOCX',
	fileNameRegex: /^[a-zA-Z0-9\s_.-]+$/,
	maxFileNameLength: 100
};

class TestBaseUploader extends BaseDocumentsUploader {
	public testValidateUploads(
		files: Express.Multer.File[],
		config: ValidationConfig,
		existingDrafts: any[],
		existingNameSet: Set<string>
	) {
		return this.validateUploads(files, config, existingDrafts, existingNameSet);
	}
	public testUploadToBlobStore(filesWithIds: FileWithId[]) {
		return this.uploadToBlobStore(filesWithIds);
	}
	public testDeleteBlobIfExists(blobName: string) {
		return this.deleteBlobIfExists(blobName);
	}
}

function setupBaseMocks() {
	const mockUploadStream = mock.fn(async (): Promise<void> => {});
	const mockDeleteBlobIfExists = mock.fn(async (): Promise<any> => ({ succeeded: true }));
	const mockInfo = mock.fn();
	const mockError = mock.fn();
	const mockValidateSingleFile = mock.fn(async (): Promise<any[]> => []);

	const uploader = new TestBaseUploader(
		{} as PrismaClient,
		{ uploadStream: mockUploadStream, deleteBlobIfExists: mockDeleteBlobIfExists } as unknown as BlobStorageClient,
		{ info: mockInfo, error: mockError } as unknown as Logger,
		{ validateSingleFile: mockValidateSingleFile } as unknown as FileValidator
	);

	return { uploader, mocks: { mockUploadStream, mockDeleteBlobIfExists, mockError, mockInfo, mockValidateSingleFile } };
}

describe('BaseDocumentsUploader', () => {
	describe('validateUploads()', () => {
		it('returns empty array when files are valid, unique, and under limit', async () => {
			const { uploader } = setupBaseMocks();
			const file = createMockFile('test.pdf', 500);
			const result = await uploader.testValidateUploads([file], mockConfig, [], new Set());
			assert.deepStrictEqual(result, []);
		});

		it('returns validation errors from the fileValidator dependency', async () => {
			const { uploader, mocks } = setupBaseMocks();
			mocks.mockValidateSingleFile.mock.mockImplementation(async () => [
				{ text: 'File type not allowed', href: '#upload-form' }
			]);
			const result = await uploader.testValidateUploads([createMockFile('bad.exe', 500)], mockConfig, [], new Set());
			assert.strictEqual(result[0].text, 'File type not allowed');
		});

		it('adds error for duplicate file names in drafts', async () => {
			const { uploader } = setupBaseMocks();
			const result = await uploader.testValidateUploads(
				[createMockFile('duplicate.pdf', 500)],
				mockConfig,
				[{ fileName: 'duplicate.pdf', size: 200 }],
				new Set()
			);
			assert.strictEqual(result[0].text, 'A file with this name has already been uploaded');
		});

		it('adds error when combined size exceeds limit', async () => {
			const { uploader } = setupBaseMocks();
			const strictConfig = { ...mockConfig, totalUploadLimit: 1000 };
			const result = await uploader.testValidateUploads(
				[createMockFile('huge.pdf', 800)],
				strictConfig,
				[{ fileName: 'existing.pdf', size: 300 }],
				new Set()
			);
			assert.ok(result[0].text.includes('Total file size of all attachments must not exceed'));
		});
	});

	describe('uploadToBlobStore()', () => {
		it('uploads files to blob storage', async () => {
			const { uploader, mocks } = setupBaseMocks();
			await uploader.testUploadToBlobStore([
				{ file: createMockFile('f.pdf', 100), originalName: 'f.pdf', blobName: 'path/f' }
			]);
			assert.strictEqual(mocks.mockUploadStream.mock.calls.length, 1);
		});

		it('throws an error if a blob upload fails', async () => {
			const { uploader, mocks } = setupBaseMocks();
			mocks.mockUploadStream.mock.mockImplementation(async () => {
				throw new Error('Azure timeout');
			});
			await assert.rejects(
				() =>
					uploader.testUploadToBlobStore([{ file: createMockFile('f.pdf', 100), originalName: 'f', blobName: 'p' }]),
				{
					message: 'Failed to upload file'
				}
			);
		});
	});

	describe('deleteBlobIfExists()', () => {
		it('handles blob deletion failures silently without crashing', async () => {
			const { uploader, mocks } = setupBaseMocks();
			mocks.mockDeleteBlobIfExists.mock.mockImplementation(async () => {
				throw new Error('Offline');
			});
			await uploader.testDeleteBlobIfExists('path/blob');
			assert.strictEqual(mocks.mockError.mock.calls.length, 1);
		});
	});
});
