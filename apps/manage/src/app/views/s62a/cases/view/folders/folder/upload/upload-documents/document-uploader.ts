import { randomUUID } from 'crypto';
import type { Prisma } from '@pins/crowndev-database/src/client/client.ts';
import { wrapPrismaError } from '@pins/crowndev-lib/util/database.ts';
import type { ValidationConfig, ValidationError } from '@pins/crowndev-lib/validators/file-validator.ts';
import { BaseDocumentsUploader, type FileWithId } from '@pins/crowndev-lib/util/base-document-uploader.ts';

export class DocumentsUploader extends BaseDocumentsUploader {
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
		const existingDrafts = await this.db.draftDocument.findMany({
			where: { sessionKey, s62aCaseId },
			select: { size: true, fileName: true }
		});

		return this.validateUploads(files, config, existingDrafts, existingNameSet);
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

		await this.uploadToBlobStore(filesWithIds);

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

		await this.db.draftDocument.delete({ where: { id: documentId } });

		if (draft.blobName) {
			await this.deleteBlobIfExists(draft.blobName);
		}
	}
}
