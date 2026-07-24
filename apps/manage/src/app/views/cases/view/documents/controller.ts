import type { NextFunction, Request, Response } from 'express';
import type { ManageService } from '#service';
import { formatBytes } from '@pins/crowndev-lib/util/upload.ts';
import { escapeHtml } from '@pins/crowndev-lib/util/string.ts';
import { NoUploadsError } from '@pins/crowndev-lib/middleware/errors.ts';
import type { ValidationConfig } from '../../../../uploads/index.ts';

interface DeleteDocumentBody {
	delete: string;
}

/**
 * Controller for uploading a new document to Azure Blob.
 * Asks the service to store it in Azure and create a draft document row.
 */
export function uploadDocumentsController(service: ManageService) {
	const { uploadDocuments } = service;
	return async (req: Request, res: Response) => {
		const { id } = req.params;
		const files = req.files as Express.Multer.File[];

		if (!id || typeof id !== 'string') {
			throw new Error('Id required for documents creation');
		}

		const insertedDocuments = await uploadDocuments.processAndDraftUploads(id, files, req.sessionID);

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
 * Asks the service to move rows from Draft to final Document status.
 */
export function createDocumentsController(service: ManageService) {
	const { uploadDocuments, logger } = service;
	return async (req: Request, res: Response) => {
		try {
			const { id } = req.params;

			if (!id || typeof id !== 'string') {
				throw new Error('Missing required parameters: id');
			}

			const { createdLength } = await uploadDocuments.commitDrafts(id, req.sessionID);

			if (createdLength === 0) {
				throw new NoUploadsError('Select a file to upload');
			}

			const folderUrl = req.baseUrl.replace(/\/upload\/?$/, '');
			return res.redirect(folderUrl);
		} catch (error) {
			logger.error({ error, caseId: req.params?.id }, 'Failed to create documents from drafts');
			return res.redirect(req.originalUrl);
		}
	};
}

/**
 * Controller used for deleting draft documents after the user has
 * uploaded a file but then decides to remove it before committing.
 */
export function deleteDocumentController(service: ManageService) {
	const { uploadDocuments, logger } = service;
	return async (req: Request<unknown, unknown, DeleteDocumentBody>, res: Response) => {
		const documentId = req.body['delete'];

		if (!documentId || typeof documentId !== 'string') {
			throw new Error('documentId required');
		}

		try {
			await uploadDocuments.deleteDraft(documentId, req.sessionID);
			return res.json({ success: true });
		} catch (error) {
			logger.error({ error, documentId }, 'Fatal error deleting document');
			return res.status(500).json({ error: 'Failed to delete file' });
		}
	};
}

export function validateUploads(service: ManageService, config: ValidationConfig) {
	const { uploadDocuments } = service;
	return async (req: Request, res: Response, next: NextFunction) => {
		const { id } = req.params;
		const files = req.files as Express.Multer.File[];

		if (!id || typeof id !== 'string') throw new Error('id param required');

		if (!files || files.length === 0) return res.redirect(req.baseUrl);

		const validationErrors = await uploadDocuments.validateUploadBatch(id, req.sessionID, files, config);

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
