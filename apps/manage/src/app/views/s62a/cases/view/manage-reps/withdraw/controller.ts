import type { ValidationConfig } from '@pins/crowndev-lib/validators/file-validator.ts';
import type { WithdrawalRequestDocumentsUploader } from './withdrawal-request-documents-uploader.ts';
import type { NextFunction, Request, Response } from 'express';
import { getStringParam, getStringParams } from '@pins/crowndev-lib/util/params.ts';
import type { ManageService } from '#service';
import { addSessionData, clearSessionData } from '@pins/crowndev-lib/util/session.ts';
import { escapeHtml } from '@pins/crowndev-lib/util/string.ts';
import { formatBytes } from '@pins/crowndev-lib/util/file.ts';
import type { ParamsDictionary } from 'express-serve-static-core';
import type { WithdrawalRequestDocumentDownloader } from './withdrawal-request-documents-downloader.ts';
import type { DownloadRequestBody } from '@pins/crowndev-lib/util/base-document-downloader.ts';
import type { AsyncRequestHandler } from '@pins/crowndev-lib/util/async-handler.ts';
import { REPRESENTATION_STATUS_ID } from '@pins/crowndev-database/src/seed/data-static.ts';
import { wrapPrismaError } from '@pins/crowndev-lib/util/database.ts';
import { notFoundHandler } from '@pins/crowndev-lib/middleware/errors.ts';
import { JOURNEY_ID } from './journey.ts';
import { clearDataFromSession } from '@planning-inspectorate/dynamic-forms';
import type { Prisma } from '@pins/crowndev-database/src/client/client.ts';
import { isValidRedirectUri } from '@pins/crowndev-lib/util/uri.ts';

type WithdrawalAnswers = {
	withdrawalReasonId: string;
	withdrawalRequestDate: Date;
	ajaxWithdrawalRequests: { itemId: string }[];
};

/**
 * Validates withdrawal uploads to make sure they pass our criteria.
 */
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

/**
 * Uploads withdrawal documents, adding to blob and creating the relevant drafts.
 * saving the files into session for the FE.
 */
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

		await setsUploadedFiles(req, db, id, representationRef, question);

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
 * Hard deletes a draft withdrawal request when a user changes their mind before full comitting.
 */
export function deleteDocumentController(documentUploader: WithdrawalRequestDocumentsUploader, service: ManageService) {
	const { logger, db } = service;
	return async (req: Request<ParamsDictionary, unknown, Record<string, unknown>>, res: Response) => {
		const documentId = getStringParam(req.body, 'delete');

		const { id, question, representationRef } = getStringParams(req.params, ['id', 'question', 'representationRef']);

		try {
			await documentUploader.deleteDraft(documentId, representationRef, req.sessionID);

			await setsUploadedFiles(req, db, id, representationRef, question);

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

/**
 * Updates a representation with the withdrawal data fields filled in, making sure to
 * move any drafts over into fully realised / committed document.
 */
export function buildSaveController(service: ManageService): AsyncRequestHandler {
	const { db, logger } = service;
	return async (req, res) => {
		const { id, representationRef } = getStringParams(req.params, ['id', 'representationRef']);

		if (!res.locals || !res.locals.journeyResponse) {
			throw new Error('journey response required');
		}

		const journeyResponse = res.locals.journeyResponse;
		const answers = journeyResponse.answers as unknown as WithdrawalAnswers;

		const representation = await db.s62aRepresentation.findUnique({
			where: { reference: representationRef },
			select: {
				id: true,
				Status: { select: { id: true } }
			}
		});

		if (!representation) {
			return notFoundHandler(req, res);
		}

		const updateInput: Prisma.S62aRepresentationUpdateInput = {
			Status: { connect: { id: REPRESENTATION_STATUS_ID.WITHDRAWN } },
			withdrawalRequestDate: answers?.withdrawalRequestDate,
			dateWithdrawn: new Date(),
			WithdrawalReason: { connect: { id: answers?.withdrawalReasonId } },
			preWithdrawalStatusId: representation?.Status?.id
		};

		try {
			await db.$transaction(async ($tx) => {
				await $tx.s62aRepresentation.update({
					where: { id: representation.id },
					data: updateInput
				});

				const draftIds = answers?.ajaxWithdrawalRequests?.map((draft) => draft.itemId);

				if (draftIds?.length) {
					const drafts = await $tx.draftBlobWithdrawalRequestDocument.findMany({
						where: {
							id: { in: draftIds },
							s62aRepresentationId: representation.id
						}
					});

					if (drafts.length > 0) {
						const realDocumentsData = drafts.map((draft) => ({
							fileName: draft.fileName,
							blobName: draft.blobName,
							size: draft.size,
							mimeType: draft.mimeType,
							s62aRepresentationId: representation.id
						}));

						await $tx.blobWithdrawalRequestDocument.createMany({
							data: realDocumentsData
						});

						await $tx.draftBlobWithdrawalRequestDocument.deleteMany({
							where: {
								id: { in: draftIds },
								s62aRepresentationId: representation.id
							}
						});

						logger.info({ representationRef, count: drafts.length }, 'added withdrawal requests and cleaned up drafts');
					} else {
						logger.info({ representationRef }, 'no drafts found to commit for given ids on current representation');
					}
				}
			});
		} catch (error) {
			wrapPrismaError({
				error,
				logger,
				message: 'withdrawing representation',
				logParams: { id, representationRef }
			});
		}

		clearSessionData(req, id, 'withdrawal-attachments', 'files');
		clearDataFromSession({ req, journeyId: JOURNEY_ID });

		const successUrl = `${req.baseUrl}/success`;

		res.redirect(isValidRedirectUri(successUrl) ? successUrl : '/');
	};
}

/**
 * Displays the success message after withdrawing a rep.
 */
export function successController(req: Request, res: Response) {
	const { id, representationRef } = getStringParams(req.params, ['id', 'representationRef']);
	clearDataFromSession({ req, journeyId: JOURNEY_ID });
	res.render('views/cases/view/manage-reps/withdraw/success.njk', {
		title: 'Representation Withdrawn',
		bodyText: `Representation reference <br><strong>${representationRef}</strong>`,
		successBackLinkUrl: `/s62a/cases/${id}/manage-representations`,
		successBackLinkText: `Go back to overview`
	});
}

/**
 * Gets the currently uploaded files in drafts and sets them onto session.
 */
async function setsUploadedFiles(
	req: Request,
	db: ManageService['db'],
	id: string,
	representationRef: string,
	question: string
) {
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
}
