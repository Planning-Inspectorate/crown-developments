import type { ValidationConfig } from '@pins/crowndev-lib/validators/file-validator.ts';
import type { WithdrawalRequestDocumentsUploader } from './withdrawal-request-documents-uploader.ts';
import type { NextFunction, Request, Response } from 'express';
import { getStringParam, getStringParams } from '@pins/crowndev-lib/util/params.ts';
import type { ManageService } from '#service';
import { addSessionData } from '@pins/crowndev-lib/util/session.ts';
import { escapeHtml } from '@pins/crowndev-lib/util/string.ts';
import { formatBytes } from '@pins/crowndev-lib/util/file.ts';
import type { ParamsDictionary } from 'express-serve-static-core';
import type { WithdrawalRequestDocumentDownloader } from './withdrawal-request-documents-downloader.ts';
import type { DownloadRequestBody } from '@pins/crowndev-lib/util/base-document-downloader.ts';

export function validateUploads(config: ValidationConfig, documentUploader: WithdrawalRequestDocumentsUploader) {
	return async (req: Request, res: Response, next: NextFunction) => {
		const representationRef = getStringParam(req.params, 'representationRef');
		const files = req.files as Express.Multer.File[];

		if (!files || files.length === 0) return res.redirect(req.baseUrl);

		const validationErrors = await documentUploader.validateUploadBatch(
			req.sessionID,
			representationRef,
			files,
			config
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

export function uploadWithdrawalDocumentsController(
	documentUploader: WithdrawalRequestDocumentsUploader,
	service: ManageService
) {
	const { db } = service;
	return async (req: Request, res: Response) => {
		const { id, question, representationRef } = getStringParams(req.params, ['id', 'question', 'representationRef']);

		const files = req.files as Express.Multer.File[];

		if (!files || files.length === 0) {
			return res.status(400).json({ error: { message: 'No file received.' } });
		}

		const insertedDocuments = await documentUploader.processAndDraftUploads(
			id,
			representationRef,
			files,
			req.sessionID
		);

		if (!insertedDocuments) return;

		const uploadedFile = insertedDocuments[0];
		const originalFile = files[0];

		const allDrafts = await db.draftBlobWithdrawalRequestDocument.findMany({
			where: {
				sessionKey: req.sessionID,
				S62aRepresentation: { reference: representationRef }
			}
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

export function deleteDocumentController(documentUploader: WithdrawalRequestDocumentsUploader, service: ManageService) {
	const { logger, db } = service;
	return async (req: Request<ParamsDictionary, unknown, Record<string, unknown>>, res: Response) => {
		const documentId = getStringParam(req.body, 'delete');

		const { id, question, representationRef } = getStringParams(req.params, ['id', 'question', 'representationRef']);

		try {
			await documentUploader.deleteDraft(documentId, representationRef, req.sessionID);

			const allDrafts = await db.draftBlobWithdrawalRequestDocument.findMany({
				where: {
					sessionKey: req.sessionID,
					S62aRepresentation: { reference: representationRef }
				}
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

export function buildDownloadDocument(service: ManageService, downloader: WithdrawalRequestDocumentDownloader) {
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
