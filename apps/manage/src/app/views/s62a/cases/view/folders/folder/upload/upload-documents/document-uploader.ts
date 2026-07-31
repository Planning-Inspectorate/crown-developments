import { Readable } from 'stream';
import { randomUUID } from 'crypto';
import type { PrismaClient, Prisma } from '@pins/crowndev-database/src/client/client.ts';
import type { BlobStorageClient } from '@pins/crowndev-lib/blob-store/blob-store-client.ts';
import type { Logger } from 'pino';
import { wrapPrismaError } from '@pins/crowndev-lib/util/database.ts';
import { formatBytes } from '../upload-utils.ts';
import type { FileValidator, ValidationConfig, ValidationError } from './file-validator.ts';

type FileWithId = {
	file: Express.Multer.File;
	originalName: string;
	blobName: string;
};

export class DocumentsUploader {
	private readonly db: PrismaClient;
	private readonly blobStore: BlobStorageClient | null;
	private readonly logger: Logger;
	private readonly fileValidator: FileValidator;

	constructor(db: PrismaClient, blobStore: BlobStorageClient | null, logger: Logger, fileValidator: FileValidator) {
		this.db = db;
		this.blobStore = blobStore;
		this.logger = logger;
		this.fileValidator = fileValidator;
	}

	/**
	 * Orchestrates all file validation rules against DB state and session drafts.
	 */
	async validateUploadBatch(
		s62aCaseId: string,
		sessionKey: string,
		files: Express.Multer.File[],
		config: ValidationConfig,
		existingNameSet: Set<string> = new Set()
	): Promise<ValidationError[]> {
		const allErrors: ValidationError[] = [];

		const validationErrors = (
			await Promise.all(files.map((file) => this.fileValidator.validateSingleFile(file, config, existingNameSet)))
		).flat();

		allErrors.push(...validationErrors);

		const [hasDuplicatesInDraft, isOverLimit] = await Promise.all([
			this.checkForDuplicateFilesInDraft(sessionKey, files, s62aCaseId),
			this.checkTotalSizeLimit(sessionKey, s62aCaseId, files, config.totalUploadLimit)
		]);

		if (hasDuplicatesInDraft) {
			allErrors.push({
				text: 'A file with this name has already been uploaded',
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
	 * Checks that the entire upload session hasn't gone over the maximum limit
	 */
	private async checkTotalSizeLimit(
		sessionKey: string,
		s62aCaseId: string,
		newFiles: Express.Multer.File[],
		totalUploadLimit: number
	): Promise<boolean> {
		const existingDrafts = await this.db.draftDocument.findMany({
			where: { sessionKey, s62aCaseId },
			select: { size: true }
		});

		const currentTotalSize = existingDrafts.reduce((acc, draft) => acc + Number(draft.size), 0);
		const newFilesSize = newFiles.reduce((acc, file) => acc + file.size, 0);

		return currentTotalSize + newFilesSize > totalUploadLimit;
	}

	/**
	 * Checks for duplicates in draft to make sure there aren't 2+ with the same name
	 */
	private async checkForDuplicateFilesInDraft(
		sessionKey: string,
		files: Express.Multer.File[],
		s62aCaseId: string
	): Promise<boolean> {
		const existingDrafts = await this.db.draftDocument.findMany({
			where: { sessionKey, s62aCaseId },
			select: { fileName: true }
		});

		const existingNames = new Set(existingDrafts.map((d) => d.fileName));

		return files.some((newFile) => {
			const newName = Buffer.from(newFile.originalname, 'latin1').toString('utf8');
			return existingNames.has(newName);
		});
	}

	/**
	 * Uploads to blob and creates drafts ready for committing
	 */
	async processAndDraftUploads(
		s62aCaseId: string,
		files: Express.Multer.File[],
		sessionKey: string,
		folderId: string
	): Promise<Prisma.DraftDocumentModel[]> {
		const filesWithIds: FileWithId[] = files.map((file) => ({
			file,
			originalName: Buffer.from(file.originalname, 'latin1').toString('utf8'),
			blobName: `${s62aCaseId}/${randomUUID()}`
		}));

		await this.uploadToBlob(filesWithIds);
		return this.saveAsDraft(filesWithIds, sessionKey, s62aCaseId, folderId);
	}

	/**
	 * Turns draft documents into real documents visible to the user.
	 */
	async commitDrafts(s62aCaseId: string, sessionKey: string): Promise<{ createdLength: number; fileNames: string[] }> {
		try {
			const drafts = await this.db.draftDocument.findMany({
				where: { sessionKey, s62aCaseId }
			});

			if (!drafts.length) {
				this.logger.info({ s62aCaseId }, 'No drafts to commit to DB');
				return { createdLength: 0, fileNames: [] };
			}

			const realDocumentsData = drafts.map((draft) => ({
				fileName: draft.fileName,
				blobName: draft.blobName,
				size: draft.size,
				s62aCaseId,
				mimeType: draft.mimeType,
				folderId: draft.folderId
			}));

			await this.db.$transaction([
				this.db.document.createMany({ data: realDocumentsData }),
				this.db.draftDocument.deleteMany({
					where: { sessionKey, s62aCaseId }
				})
			]);

			this.logger.info({ s62aCaseId, count: drafts.length }, 'Documents successfully committed to DB');

			return {
				createdLength: drafts.length,
				fileNames: drafts.map((d) => d.fileName)
			};
		} catch (error: unknown) {
			wrapPrismaError({
				error,
				logger: this.logger,
				message: 'Failed to create document rows from session',
				logParams: { s62aCaseId }
			});
			throw error;
		}
	}

	/**
	 * Hard deletes drafts before they are committed
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

	private async saveAsDraft(
		filesWithIds: FileWithId[],
		sessionKey: string,
		s62aCaseId: string,
		folderId: string
	): Promise<Prisma.DraftDocumentModel[]> {
		const operations = filesWithIds.map((file) =>
			this.db.draftDocument.create({
				data: {
					sessionKey,
					s62aCaseId,
					fileName: file.originalName,
					blobName: file.blobName,
					size: BigInt(file.file.size),
					mimeType: file.file.mimetype,
					folderId
				}
			})
		);
		return await this.db.$transaction(operations);
	}
}
