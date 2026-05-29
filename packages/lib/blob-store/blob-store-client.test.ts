import { describe, it, mock, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert';
import { Readable } from 'node:stream';
import { BlobStorageClient } from './blob-store-client.ts';
import { BlobServiceClient } from '@azure/storage-blob';
import type { Logger } from 'pino';

describe('BlobStorageClient', () => {
	let mockLogger: Logger;
	let mockBlockBlobClient: Record<string, ReturnType<typeof mock.fn>>;
	let mockBlobClient: Record<string, ReturnType<typeof mock.fn>>;
	let mockContainerClient: Record<string, ReturnType<typeof mock.fn>>;

	/**
	 * Mocked Blob client, DI'd into class.
	 */
	class FakeBlobServiceClient {
		constructor() {}
		static fromConnectionString() {
			return new FakeBlobServiceClient();
		}
		getContainerClient() {
			return mockContainerClient;
		}
	}

	beforeEach(() => {
		mockLogger = {
			error: mock.fn(),
			info: mock.fn()
		} as unknown as Logger;

		mockBlockBlobClient = {
			uploadData: mock.fn(async () => ({ requestId: 'upload-data-123' })),
			uploadStream: mock.fn(async () => ({ requestId: 'upload-stream-123' })),
			exists: mock.fn(async () => true),
			deleteIfExists: mock.fn(async () => ({ succeeded: true })),
			download: mock.fn(async () => ({ readableStreamBody: 'fake-stream' })),
			url: 'https://mock.blob.core.windows.net/container/file.txt' as unknown as ReturnType<typeof mock.fn>
		};

		mockBlobClient = {
			exists: mock.fn(async () => true)
		};

		mockContainerClient = {
			createIfNotExists: mock.fn(async () => ({})),
			getBlockBlobClient: mock.fn(() => mockBlockBlobClient),
			getBlobClient: mock.fn(() => mockBlobClient),
			listBlobsFlat: mock.fn(async function* (options) {
				yield {
					name: options?.prefix ? `${options.prefix}/doc1.pdf` : 'doc1.pdf',
					properties: { contentLength: 1024, createdOn: new Date('2026-01-01'), lastModified: new Date('2026-01-02') }
				};
			})
		};
	});

	afterEach(() => {
		mock.restoreAll();
	});

	function createClient(connectionString?: string) {
		return new BlobStorageClient(
			mockLogger,
			'https://example.com', // Never actually called so no risk, but generic test url either way.
			'test-container',
			connectionString,
			FakeBlobServiceClient as unknown as typeof BlobServiceClient
		);
	}

	describe('Initialisation', () => {
		it('should initialize using the connection string if provided', () => {
			const spy = mock.method(FakeBlobServiceClient, 'fromConnectionString');
			createClient('Endpoint=sb://fake-connection-string;');
			assert.strictEqual(spy.mock.callCount(), 1);
		});
	});

	describe('upload()', () => {
		it('should successfully upload a buffer', async () => {
			const client = createClient();
			const buffer = Buffer.from('test data');

			const result = await client.upload(buffer, 'application/pdf', 'test.pdf');

			assert.strictEqual(mockContainerClient.createIfNotExists.mock.callCount(), 1);
			assert.strictEqual(mockBlockBlobClient.uploadData.mock.callCount(), 1);

			const [passedBuffer, passedOptions] = mockBlockBlobClient.uploadData.mock.calls[0].arguments;
			assert.strictEqual(passedBuffer, buffer);
			assert.deepStrictEqual(passedOptions, { blobHTTPHeaders: { blobContentType: 'application/pdf' } });

			assert.strictEqual(result.requestId, 'upload-data-123');
		});

		it('should log an error and throw if uploadData fails', async () => {
			const client = createClient();
			const error = new Error('Upload failed');
			mockBlockBlobClient.uploadData = mock.fn(async () => {
				throw error;
			});

			await assert.rejects(client.upload(Buffer.from(''), 'text/plain', 'test.txt'), error);
			assert.strictEqual((mockLogger.error as unknown as ReturnType<typeof mock.fn>).mock.callCount(), 1);
		});
	});

	describe('uploadStream()', () => {
		it('should successfully upload a stream', async () => {
			const client = createClient();
			const stream = Readable.from(['test stream chunk']);

			await client.uploadStream(stream, 'image/jpeg', 'image.jpg', 1024, 5);

			assert.strictEqual(mockBlockBlobClient.uploadStream.mock.callCount(), 1);
			const [passedStream, bufferSize, concurrency, options] = mockBlockBlobClient.uploadStream.mock.calls[0].arguments;

			assert.strictEqual(passedStream, stream);
			assert.strictEqual(bufferSize, 1024);
			assert.strictEqual(concurrency, 5);
			assert.deepStrictEqual(options, { blobHTTPHeaders: { blobContentType: 'image/jpeg' } });
		});
	});

	describe('Existence and Deletion Checks (checkBlobExists)', () => {
		it('should return the blob URL if it exists', async () => {
			const client = createClient();
			const url = await client.getBlobUrl('test.pdf');
			assert.strictEqual(url, 'https://mock.blob.core.windows.net/container/file.txt');
		});

		it('should throw an error when getting URL if blob does not exist', async () => {
			const client = createClient();
			mockBlockBlobClient.exists = mock.fn(async () => false);

			await assert.rejects(client.getBlobUrl('missing.pdf'), /blob does not exist/);
			assert.strictEqual((mockLogger.error as unknown as ReturnType<typeof mock.fn>).mock.callCount(), 1);
		});

		it('should successfully delete a blob if it exists', async () => {
			const client = createClient();
			const result = await client.deleteBlobIfExists('test.pdf');
			assert.strictEqual(result.succeeded, true);
			assert.strictEqual(mockBlockBlobClient.deleteIfExists.mock.callCount(), 1);
		});

		it('should return boolean state from doesBlobExist without throwing', async () => {
			const client = createClient();

			let exists = await client.doesBlobExist('test.pdf');
			assert.strictEqual(exists, true);
			assert.strictEqual(mockContainerClient.getBlobClient.mock.calls[0].arguments[0], 'test.pdf');

			mockBlobClient.exists = mock.fn(async () => false);
			exists = await client.doesBlobExist('missing.pdf');
			assert.strictEqual(exists, false);
		});
	});

	describe('downloadBlob()', () => {
		it('should download a blob if it exists', async () => {
			const client = createClient();
			const result = await client.downloadBlob('test.pdf');

			assert.strictEqual(mockBlockBlobClient.exists.mock.callCount(), 1);
			assert.strictEqual(mockBlockBlobClient.download.mock.callCount(), 1);
			assert.strictEqual(result.readableStreamBody, 'fake-stream');
		});
	});

	describe('getContainerContents()', () => {
		it('should list blobs flat and map them to BlobMetaData', async () => {
			const client = createClient();
			const result = await client.getContainerContents();

			assert.strictEqual(mockContainerClient.createIfNotExists.mock.callCount(), 1);
			assert.strictEqual(mockContainerClient.listBlobsFlat.mock.callCount(), 1);
			assert.strictEqual(mockContainerClient.listBlobsFlat.mock.calls[0].arguments[0], undefined);

			assert.strictEqual(result.length, 1);
			assert.strictEqual(result[0].name, 'doc1.pdf');
			assert.strictEqual(result[0].size, 1024);
		});

		it('should pass folderName as prefix if provided', async () => {
			const client = createClient();
			const result = await client.getContainerContents('my-folder');

			assert.deepStrictEqual(mockContainerClient.listBlobsFlat.mock.calls[0].arguments[0], { prefix: 'my-folder' });
			assert.strictEqual(result[0].name, 'my-folder/doc1.pdf');
		});
	});
});
