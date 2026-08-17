import { Readable } from 'stream';
import type { PrismaClient } from '@pins/crowndev-database/src/client/client.ts';
import type { BlobStorageClient } from '@pins/crowndev-lib/blob-store/blob-store-client.ts';
import type { Logger } from 'pino';
import type { FileValidator, ValidationConfig, ValidationError } from '../validators/file-validator.ts';
import { formatBytes } from '@pins/crowndev-lib/util/file.ts';

export type FileWithId = {
	file: Express.Multer.File;
	originalName: string;
	blobName: string;
};

export abstract class BaseDocumentsUploader {
	protected readonly db: PrismaClient;
	protected readonly blobStore: BlobStorageClient | null;
	protected readonly logger: Logger;
	protected readonly fileValidator: FileValidator;

	constructor(db: PrismaClient, blobStore: BlobStorageClient | null, logger: Logger, fileValidator: FileValidator) {
		this.db = db;
		this.blobStore = blobStore;
		this.logger = logger;
		this.fileValidator = fileValidator;
	}

	/**
	 * Reusable validation logic.
	 * Subclasses query the DB for existing drafts and pass them here.
	 */
	protected async validateUploads(
		files: Express.Multer.File[],
		config: ValidationConfig,
		existingDrafts: { fileName: string; size: bigint | number }[],
		existingNameSet: Set<string>
	): Promise<ValidationError[]> {
		const allErrors: ValidationError[] = [];

		const validationErrors = (
			await Promise.all(files.map((file) => this.fileValidator.validateSingleFile(file, config, existingNameSet)))
		).flat();
		allErrors.push(...validationErrors);

		const currentTotalSize = existingDrafts.reduce((acc, draft) => acc + Number(draft.size), 0);
		const newFilesSize = files.reduce((acc, file) => acc + file.size, 0);
		if (currentTotalSize + newFilesSize > config.totalUploadLimit) {
			allErrors.push({
				text: `Total file size of all attachments must not exceed ${formatBytes(config.totalUploadLimit)}`,
				href: '#upload-form'
			});
		}

		const existingNames = new Set(existingDrafts.map((d) => d.fileName));
		const hasDuplicatesInDraft = files.some((newFile) => {
			const newName = Buffer.from(newFile.originalname, 'latin1').toString('utf8');
			return existingNames.has(newName);
		});

		if (hasDuplicatesInDraft) {
			allErrors.push({
				text: 'A file with this name has already been uploaded',
				href: '#upload-form'
			});
		}

		return allErrors;
	}

	/**
	 * Shared Blob Uploading
	 */
	protected async uploadToBlobStore(filesWithIds: FileWithId[]): Promise<void> {
		for (const item of filesWithIds) {
			try {
				await this.blobStore?.uploadStream(Readable.from(item.file.buffer), item.file.mimetype, item.blobName);
			} catch (error) {
				this.logger.error({ error }, `Error uploading file: ${item.blobName}`);
				throw new Error('Failed to upload file', { cause: error });
			}
		}
	}

	/**
	 * Shared Blob Deletion
	 */
	protected async deleteBlobIfExists(blobName: string): Promise<void> {
		try {
			const response = await this.blobStore?.deleteBlobIfExists(blobName);
			if (response?.succeeded) {
				this.logger.info({ blobName }, 'Successfully deleted blob');
			}
		} catch (error) {
			this.logger.error({ error, blobName }, 'Failed to delete blob');
		}
	}
}
