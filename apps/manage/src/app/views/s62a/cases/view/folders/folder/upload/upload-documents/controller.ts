import type { NextFunction, Request, Response } from 'express';
import type { ManageService } from '#service';
import { escapeHtml } from '@pins/crowndev-lib/util/string.ts';
import type { DocumentsUploader } from './document-uploader.ts';
import { getStringParam, getStringParams } from '@pins/crowndev-lib/util/params.ts';
import { NoUploadsError } from '@pins/crowndev-lib/middleware/errors.ts';
import { addSessionData } from '@pins/crowndev-lib/util/session.ts';
import type { ValidationConfig } from '@pins/crowndev-lib/validators/file-validator.ts';
import { formatBytes } from '@pins/crowndev-lib/util/file.ts';
import { FILE_AUDIT_ACTIONS } from '@pins/crowndev-lib/audit/files.ts';
import { recordS62aFileAudit } from '../../../../../audit/files.ts';

/**
 * Controller for uploading a new document to Azure Blob.
 * Asks the service to store it in Azure and create a draft document row.
 */
export function uploadDocumentsController(documentUploader: DocumentsUploader) {
	return async (req: Request, res: Response) => {
		const { id, folderId } = getStringParams(req.params, ['id', 'folderId']);
		const files = req.files as Express.Multer.File[];

		const insertedDocuments = await documentUploader.processAndDraftUploads(id, files, req.sessionID, folderId);

		const uploadedFile = insertedDocuments[0];
		const originalFile = files[0];

		return res.json({
			file: {
				id: uploadedFile.id,
				originalname: uploadedFile.fileName,
				filename: uploadedFile.id,
				path: uploadedFile.blobName,
				size: originalFile.size
			},
			success: {
				messageHtml: `<span class="moj-multi-file-upload__filename">${escapeHtml(uploadedFile.fileName)} (${formatBytes(originalFile.size)})</span>`
			}
		});
	};
}

/**
 * Controller used when "Committing" documents.
 * Asks the service to move rows from Draft to final Document status,
 * then records the upload in the case history.
 */
export function createDocumentsController(service: ManageService, documentUploader: DocumentsUploader) {
	const { logger } = service;
	return async (req: Request, res: Response) => {
		const id = getStringParam(req.params, 'id');
		try {
			const { createdLength, fileNames } = await documentUploader.commitDrafts(id, req.sessionID);
			if (createdLength === 0) {
				throw new NoUploadsError('Select a file to upload');
			}

			await recordS62aFileAudit(service, req, id, fileNames, FILE_AUDIT_ACTIONS.uploaded, {
				folderName: await getFolderName(service, req)
			});

			const folderUrl = req.baseUrl.replace(/\/upload\/?$/, '');
			return res.redirect(folderUrl);
		} catch (error) {
			logger.error({ error, caseId: req.params?.id }, 'Failed to create documents from drafts');
			const errorMessage =
				error instanceof NoUploadsError
					? error.message
					: 'There was a problem saving your documents. Please try again.';

			addSessionData(
				req,
				id,
				{
					uploadErrors: [
						{
							text: errorMessage,
							href: '#main-content'
						}
					]
				},
				'files'
			);

			return res.redirect(req.baseUrl);
		}
	};
}

/**
 * The name of the folder the files were uploaded to, for the case history.
 * Falls back to '-' if it can't be found, so the upload is still recorded.
 */
async function getFolderName(service: ManageService, req: Request): Promise<string> {
	try {
		const folderId = getStringParam(req.params, 'folderId');
		const folder = await service.db.folder.findUnique({
			where: { id: folderId },
			select: { displayName: true }
		});

		return folder?.displayName ?? '-';
	} catch (error) {
		service.logger.warn({ error }, 'Could not look up the folder name for the upload audit');
		return '-';
	}
}

/**
 * Controller used for deleting draft documents after the user has
 * uploaded a file but then decides to remove it before committing.
 */
export function deleteDocumentController(service: ManageService, documentUploader: DocumentsUploader) {
	const { logger } = service;
	return async (req: Request<unknown, unknown, Record<string, unknown>>, res: Response) => {
		const documentId = getStringParam(req.body, 'delete');

		try {
			await documentUploader.deleteDraft(documentId, req.sessionID);
			return res.json({ success: true });
		} catch (error) {
			logger.error({ error, documentId }, 'Fatal error deleting document');
			return res.status(500).json({ error: 'Failed to delete file' });
		}
	};
}

export function validateUploads(
	config: ValidationConfig,
	documentUploader: DocumentsUploader,
	db: ManageService['db']
) {
	return async (req: Request, res: Response, next: NextFunction) => {
		const { id, folderId } = getStringParams(req.params, ['id', 'folderId']);
		const files = req.files as Express.Multer.File[];

		if (!files || files.length === 0) return res.redirect(req.baseUrl);

		const existingNames = await getExistingFileNamesInFolder(db, folderId);
		const existingNameSet = new Set(existingNames);

		const validationErrors = await documentUploader.validateUploadBatch(
			id,
			req.sessionID,
			files,
			config,
			existingNameSet
		);

		if (validationErrors.length > 0) {
			return res.json({
				error: {
					message: validationErrors.map((e) => e.text).join(', ')
				}
			});
		}

		next();
	};
}

/**
 * Checks if file names already exist in a folder (database)
 * Used for both upload and move operations
 */
export async function getExistingFileNamesInFolder(db: ManageService['db'], folderId: string): Promise<string[]> {
	const folder = await db.folder.findUnique({
		where: { id: folderId },
		include: {
			Documents: {
				where: { deletedAt: null }, // Do not worry if a soft deleted file as only live files are relevant
				select: { fileName: true }
			}
		}
	});
	return folder?.Documents.map((doc) => doc.fileName) ?? [];
}
