import { Readable } from 'stream';
import { randomUUID } from 'crypto';
import type { PrismaClient, Prisma } from '@pins/crowndev-database/src/client/client.ts';
import type { BlobStorageClient } from '@pins/crowndev-lib/blob-store/blob-store-client.ts';
import type { Logger } from 'pino';
import { wrapPrismaError } from '@pins/crowndev-lib/util/database.js';
import { formatBytes } from '@pins/crowndev-lib/util/upload.ts';

export interface ValidationConfig {
	allowedExtensions: string[];
	allowedMimeTypes: string[];
	maxFileSize: number;
	totalUploadLimit: number;
}

export interface ValidationError {
	text: string;
	href: string;
}

type FileWithId = {
	file: Express.Multer.File;
	originalName: string;
	blobName: string;
};

export class UploadDocumentsService {
	private readonly db: PrismaClient;
	private readonly blobStore: BlobStorageClient | null;
	private readonly logger: Logger;

	constructor(db: PrismaClient, blobStore: BlobStorageClient | null, logger: Logger) {
		this.db = db;
		this.blobStore = blobStore;
		this.logger = logger;
	}

	/**
	 * Orchestrates all file validation rules against DB state and session drafts.
	 * Evaluates size limits, allowed extensions, mime types
	 */
	async validateUploadBatch(
		crownDevelopmentId: string,
		sessionKey: string,
		files: Express.Multer.File[],
		config: ValidationConfig
	): Promise<ValidationError[]> {
		const allErrors: ValidationError[] = [];

		for (const file of files) {
			const fileErrors = this.validateSingleFile(file, config);
			allErrors.push(...fileErrors);
		}

		const [hasDuplicatesInDraft, isOverLimit] = await Promise.all([
			this.checkForDuplicateFilesInDraft(sessionKey, files, crownDevelopmentId),
			this.checkTotalSizeLimit(sessionKey, crownDevelopmentId, files, config.totalUploadLimit)
		]);

		if (hasDuplicatesInDraft) {
			allErrors.push({
				text: 'File with this name has already been uploaded in this session',
				href: '#upload-form'
			});
		}

		if (isOverLimit) {
			allErrors.push({
				text: `Total file size of all attachments must not exceed ${formatBytes(config.totalUploadLimit)}`,
				href: '#upload-form'
			});
		}

		return allErrors;
	}

	/**
	 * Uploads files to Azure Blob and creates draft document rows.
	 */
	async processAndDraftUploads(
		crownDevelopmentId: string,
		files: Express.Multer.File[],
		sessionKey: string
	): Promise<Prisma.DraftDocumentModel[]> {
		const filesWithIds: FileWithId[] = files.map((file) => ({
			file,
			originalName: Buffer.from(file.originalname, 'latin1').toString('utf8'),
			blobName: `${crownDevelopmentId}/${randomUUID()}`
		}));

		await this.uploadToBlob(filesWithIds);
		return this.saveAsDraft(filesWithIds, sessionKey, crownDevelopmentId);
	}

	/**
	 * Commits DraftDocument rows to the database as Document rows.
	 */
	async commitDrafts(
		crownDevelopmentId: string,
		sessionKey: string
	): Promise<{ createdLength: number; fileNames: string[] }> {
		try {
			const drafts = await this.db.draftDocument.findMany({
				where: { sessionKey, crownDevelopmentId }
			});

			if (!drafts.length) {
				this.logger.info({ crownDevelopmentId }, 'No drafts to commit to DB');
				return { createdLength: 0, fileNames: [] };
			}

			const realDocumentsData = drafts.map((draft) => ({
				fileName: draft.fileName,
				blobName: draft.blobName,
				size: draft.size,
				crownDevelopmentId,
				mimeType: draft.mimeType
			}));

			await this.db.$transaction([
				this.db.document.createMany({ data: realDocumentsData }),
				this.db.draftDocument.deleteMany({
					where: { sessionKey, crownDevelopmentId }
				})
			]);

			this.logger.info({ crownDevelopmentId, count: drafts.length }, 'Documents successfully committed to DB');

			return {
				createdLength: drafts.length,
				fileNames: drafts.map((d) => d.fileName)
			};
		} catch (error: unknown) {
			wrapPrismaError({
				error,
				logger: this.logger,
				message: 'Failed to create document rows from session',
				logParams: { crownDevelopmentId }
			});
			throw error;
		}
	}

	/**
	 * Deletes a draft document row and its related Azure blob.
	 */
	async deleteDraft(documentId: string, sessionKey: string): Promise<void> {
		const draft = await this.db.draftDocument.findFirst({
			where: { id: documentId, sessionKey }
		});

		if (!draft) {
			this.logger.warn({ documentId }, 'No draft row found for given id.');
			return;
		}

		await this.db.draftDocument.delete({
			where: { id: documentId }
		});

		if (draft.blobName) {
			try {
				const response = await this.blobStore?.deleteBlobIfExists(draft.blobName);
				if (response?.succeeded) {
					this.logger.info({ blobName: draft.blobName }, 'Successfully deleted blob');
				}
			} catch (error) {
				this.logger.error({ error, blobName: draft.blobName }, 'Failed to delete blob');
			}
		}
	}

	/**
	 * Validates a single file's extension, mime type, and size.
	 */
	private validateSingleFile(file: Express.Multer.File, config: ValidationConfig): ValidationError[] {
		const errors: ValidationError[] = [];
		const fileName = Buffer.from(file.originalname, 'latin1').toString('utf8');
		const extension = fileName.split('.').pop()?.toLowerCase() || '';

		if (!config.allowedExtensions.includes(extension) || !config.allowedMimeTypes.includes(file.mimetype)) {
			errors.push({ text: `${fileName} must be an allowed file type`, href: '#upload-form' });
		}

		if (file.size > config.maxFileSize) {
			errors.push({
				text: `${fileName} must be smaller than ${formatBytes(config.maxFileSize)}`,
				href: '#upload-form'
			});
		}

		return errors;
	}

	/**
	 * Evaluates if appending newly uploaded file sizes to the current draft state exceeds the strict session limits.
	 */
	private async checkTotalSizeLimit(
		sessionKey: string,
		crownDevelopmentId: string,
		newFiles: Express.Multer.File[],
		totalUploadLimit: number
	): Promise<boolean> {
		const existingDrafts = await this.db.draftDocument.findMany({
			where: { sessionKey, crownDevelopmentId },
			select: { size: true }
		});

		const currentTotalSize = existingDrafts.reduce((acc, draft) => acc + Number(draft.size), 0);
		const newFilesSize = newFiles.reduce((acc, file) => acc + file.size, 0);

		return currentTotalSize + newFilesSize > totalUploadLimit;
	}

	/**
	 * We check for duplicate files in session (not blob), as we store the files
	 * in blob under a UUID to stop orphan files blocking upload.
	 */
	private async checkForDuplicateFilesInDraft(
		sessionKey: string,
		files: Express.Multer.File[],
		caseId: string
	): Promise<boolean> {
		const existingDrafts = await this.db.draftDocument.findMany({
			where: { sessionKey, caseId },
			select: { fileName: true }
		});

		const existingNames = new Set(existingDrafts.map((d) => d.fileName));

		return files.some((newFile) => {
			const newName = Buffer.from(newFile.originalname, 'latin1').toString('utf8');
			return existingNames.has(newName);
		});
	}

	/**
	 * Uploads the new files into blob storage
	 */
	private async uploadToBlob(filesWithIds: FileWithId[]): Promise<void> {
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
	 * Attempts to create draft document rows for the newly created blob files
	 */
	private async saveAsDraft(
		filesWithIds: FileWithId[],
		sessionKey: string,
		crownDevelopmentId: string
	): Promise<Prisma.DraftDocumentModel[]> {
		const operations = filesWithIds.map((file) =>
			this.db.draftDocument.create({
				data: {
					sessionKey,
					crownDevelopmentId,
					fileName: file.originalName,
					blobName: file.blobName,
					size: BigInt(file.file.size),
					mimeType: file.file.mimetype
				}
			})
		);
		return await this.db.$transaction(operations);
	}
}
