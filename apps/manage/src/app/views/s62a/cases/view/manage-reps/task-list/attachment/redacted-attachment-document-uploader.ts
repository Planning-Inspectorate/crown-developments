import { randomUUID } from 'crypto';
import type { Prisma } from '@pins/crowndev-database/src/client/client.ts';
import { REPRESENTATION_STATUS_ID } from '@pins/crowndev-database/src/seed/data-static.ts';
import type { ValidationConfig, ValidationError } from '@pins/crowndev-lib/validators/file-validator.ts';
import { BaseDocumentsUploader, type FileWithId } from '@pins/crowndev-lib/util/base-document-uploader.ts';

/**
 * Class for uploading documents associated with a representation.
 */
export class RedactedAttachmentUploader extends BaseDocumentsUploader {
	/**
	 * Validates files against basic criteria
	 */
	async validateUploadBatch(
		sessionKey: string,
		files: Express.Multer.File[],
		config: ValidationConfig,
		existingNameSet: Set<string> = new Set()
	): Promise<ValidationError[]> {
		const existingDrafts = await this.db.draftBlobRepresentationDocument.findMany({
			where: { sessionKey },
			select: { size: true, fileName: true }
		});

		return this.validateUploads(files, config, existingDrafts, existingNameSet);
	}

	/**
	 * Creates draft uploads, ready to be committed.
	 */
	async processAndDraftUploads(
		caseId: string,
		files: Express.Multer.File[],
		sessionKey: string,
		targetDocumentId: string
	): Promise<Prisma.DraftBlobRepresentationDocumentModel[]> {
		const statusId = REPRESENTATION_STATUS_ID.AWAITING_REVIEW;

		const filesWithIds: FileWithId[] = files.map((file) => ({
			file,
			originalName: Buffer.from(file.originalname, 'latin1').toString('utf8'),
			blobName: `${caseId}/representations/${randomUUID()}`
		}));

		await this.uploadToBlobStore(filesWithIds);

		const operations = filesWithIds.map((file) =>
			this.db.draftBlobRepresentationDocument.create({
				data: {
					sessionKey,
					targetDocumentId,
					fileName: file.originalName,
					blobName: file.blobName,
					size: BigInt(file.file.size),
					mimeType: file.file.mimetype,
					statusId
				}
			})
		);
		return await this.db.$transaction(operations);
	}

	/**
	 * Hard deletes a draft, for when a user changes their mind about uploading,
	 * specifically targeting the targetDocumentId (i.e. all redacted drafts that
	 * would have been connected to that document eventually)
	 */
	async deleteDraft(documentId: string, sessionKey: string): Promise<string | void> {
		const draft = await this.db.draftBlobRepresentationDocument.findFirst({
			where: { targetDocumentId: documentId, sessionKey }
		});

		if (!draft) {
			this.logger.warn({ documentId }, 'No draft row found for given id.');
			return;
		}

		await this.db.draftBlobRepresentationDocument.delete({ where: { id: draft.id } });

		if (draft.blobName) {
			await this.deleteBlobIfExists(draft.blobName);
		}

		return draft.blobName;
	}
}
