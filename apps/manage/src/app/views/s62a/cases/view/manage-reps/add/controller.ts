import type { NextFunction, Request, Response } from 'express';
import { getStringParam, getStringParams } from '@pins/crowndev-lib/util/params.ts';
import type { RepresentationDocumentsUploader } from './representation-document-uploader.ts';
import { escapeHtml } from '@pins/crowndev-lib/util/string.ts';
import { addSessionData } from '@pins/crowndev-lib/util/session.ts';
import type { ManageService } from '#service';
import type { ValidationConfig } from '@pins/crowndev-lib/validators/file-validator.ts';
import { formatBytes } from '@pins/crowndev-lib/util/file.ts';
import type { ParamsDictionary } from 'express-serve-static-core';
import type { RepresentationDocumentDownloader } from './representation-document-downloader.ts';
import type { DownloadRequestBody } from '@pins/crowndev-lib/util/base-document-downloader.ts';

/**
 * Controller for uploading a new representation document to Azure Blob.
 * Asks the service to store it in Azure and create a draft document row.
 */
export function uploadRepresentationDocumentsController(
	documentUploader: RepresentationDocumentsUploader,
	service: ManageService
) {
	const { db } = service;
	return async (req: Request, res: Response) => {
		const { id, question } = getStringParams(req.params, ['id', 'question']);

		const files = req.files as Express.Multer.File[];

		if (!files || files.length === 0) {
			return res.status(400).json({ error: { message: 'No file received.' } });
		}

		const insertedDocuments = await documentUploader.processAndDraftUploads(id, files, req.sessionID);

		const uploadedFile = insertedDocuments[0];
		const originalFile = files[0];

		const allDrafts = await db.draftBlobRepresentationDocument.findMany({
			where: { sessionKey: req.sessionID }
		});

		const uploadedFiles = allDrafts.map((draft) => ({
			itemId: draft.id,
			fileName: draft.fileName,
			mimeType: draft.mimeType,
			size: Number(draft.size)
		}));

		addSessionData(req, id, { [question]: { uploadedFiles } }, 'files');

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

export function validateUploads(config: ValidationConfig, documentUploader: RepresentationDocumentsUploader) {
	return async (req: Request, res: Response, next: NextFunction) => {
		const files = req.files as Express.Multer.File[];

		if (!files || files.length === 0) return res.redirect(req.baseUrl);

		const validationErrors = await documentUploader.validateUploadBatch(req.sessionID, files, config);

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
 * Controller used for deleting draft documents after the user has
 * uploaded a file but then decides to remove it before committing.
 */
export function deleteDocumentController(service: ManageService, documentUploader: RepresentationDocumentsUploader) {
	const { logger, db } = service;
	return async (req: Request<ParamsDictionary, unknown, Record<string, unknown>>, res: Response) => {
		const documentId = getStringParam(req.body, 'delete');

		const { id, question } = getStringParams(req.params, ['id', 'question']);

		try {
			await documentUploader.deleteDraft(documentId, req.sessionID);

			const allDrafts = await db.draftBlobRepresentationDocument.findMany({
				where: { sessionKey: req.sessionID }
			});

			const uploadedFiles = allDrafts.map((draft) => ({
				itemId: draft.id,
				fileName: draft.fileName,
				mimeType: draft.mimeType,
				size: Number(draft.size)
			}));

			addSessionData(req, id, { [question]: { uploadedFiles } }, 'files');

			return res.json({ success: true });
		} catch (error) {
			logger.error({ error, documentId }, 'Fatal error deleting document');
			return res.status(500).json({ error: 'Failed to delete file' });
		}
	};
}

export function buildDownloadDocument(service: ManageService, downloader: RepresentationDocumentDownloader) {
	return async (req: Request<ParamsDictionary, unknown, DownloadRequestBody>, res: Response) => {
		try {
			await downloader.processDownload(req, res);
		} catch (error) {
			service.logger.error({ error }, 'Unhandled error in document download');
			if (!res.headersSent) {
				res.status(500).send('Internal Server Error');
			}
		}
	};
}
