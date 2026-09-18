import { randomUUID } from 'crypto';
import type { Prisma } from '@pins/crowndev-database/src/client/client.ts';
import type { ValidationConfig, ValidationError } from '@pins/crowndev-lib/validators/file-validator.ts';
import { BaseDocumentsUploader, type FileWithId } from '@pins/crowndev-lib/util/base-document-uploader.ts';

/**
 * Class for uploading documents associated with the withdrawal of a representation
 */
export class WithdrawalRequestDocumentsUploader extends BaseDocumentsUploader {
	/**
	 * Validates files against basic criteria
	 */
	async validateUploadBatch(
		sessionKey: string,
		representationRef: string,
		files: Express.Multer.File[],
		config: ValidationConfig,
		existingNameSet: Set<string> = new Set()
	): Promise<ValidationError[]> {
		const existingDrafts = await this.db.draftBlobWithdrawalRequestDocument.findMany({
			where: {
				sessionKey,
				S62aRepresentation: {
					reference: representationRef
				}
			},
			select: { size: true, fileName: true }
		});

		return this.validateUploads(files, config, existingDrafts, existingNameSet);
	}

	/**
	 * Creates draft uploads, ready to be committed.
	 */
	async processAndDraftUploads(
		caseId: string,
		representationRef: string,
		files: Express.Multer.File[],
		sessionKey: string
	): Promise<Prisma.DraftBlobWithdrawalRequestDocumentModel[] | undefined> {
		const representation = await this.db.s62aRepresentation.findUnique({
			where: {
				reference: representationRef
			},
			select: {
				id: true
			}
		});

		if (!representation) {
			this.logger.warn({ representationRef }, 'No representation found for reference.');
			return;
		}

		const filesWithIds: FileWithId[] = files.map((file) => ({
			file,
			originalName: Buffer.from(file.originalname, 'latin1').toString('utf8'),
			blobName: `${caseId}/representations/withdrawal/${randomUUID()}`
		}));

		await this.uploadToBlobStore(filesWithIds);

		const operations = filesWithIds.map((file) =>
			this.db.draftBlobWithdrawalRequestDocument.create({
				data: {
					sessionKey,
					s62aRepresentationId: representation.id,
					fileName: file.originalName,
					blobName: file.blobName,
					size: BigInt(file.file.size),
					mimeType: file.file.mimetype
				}
			})
		);
		return await this.db.$transaction(operations);
	}

	/**
	 * Hard deletes a draft, for when a user changes their mind about uploading
	 * something.
	 */
	async deleteDraft(documentId: string, representationRef: string, sessionKey: string): Promise<void> {
		const representation = await this.db.s62aRepresentation.findUnique({
			where: {
				reference: representationRef
			},
			select: {
				id: true
			}
		});

		if (!representation) {
			this.logger.warn({ representationRef }, 'No representation found for reference.');
			return;
		}

		const draft = await this.db.draftBlobWithdrawalRequestDocument.findFirst({
			where: {
				id: documentId,
				sessionKey,
				s62aRepresentationId: representation.id
			}
		});

		if (!draft) {
			this.logger.warn({ documentId }, 'No draft row found for given id.');
			return;
		}

		await this.db.draftBlobWithdrawalRequestDocument.delete({ where: { id: documentId } });

		if (draft.blobName) {
			await this.deleteBlobIfExists(draft.blobName);
		}
	}
}
