import type { ManageService } from '#service';
import { getRepresentationValidationErrors } from '@pins/crowndev-lib/forms/representations/validation-utils.ts';
import { notFoundHandler } from '@pins/crowndev-lib/middleware/errors.ts';
import type { AsyncRequestHandler } from '@pins/crowndev-lib/util/async-handler.ts';
import { getStringParams } from '@pins/crowndev-lib/util/params.ts';
import { addSessionData } from '@pins/crowndev-lib/util/session.ts';
import { buildRedactRepresentationDocument } from './task-list/attachment/controller.ts';
import type { NextFunction, Request, Response } from 'express';
import type { ParamsDictionary } from 'express-serve-static-core';
import type { ErrorSummaryItem } from '@pins/crowndev-lib/util/types.ts';
import {
	type ExpressValidationErrors,
	expressValidationErrorsToGovUkErrorList
} from '@planning-inspectorate/dynamic-forms';

/**
 * Validate a representation before it can be accepted, rejected or redacted
 */
export function buildValidateRepresentationMiddleware(service: ManageService): AsyncRequestHandler {
	return async (req, res, next) => {
		const { db, logger } = service;
		const { id, representationRef } = getStringParams(req.params, ['id', 'representationRef']);

		logger.info({ representationReference: representationRef }, 'validate representation');
		const representation = await db.s62aRepresentation.findUnique({
			where: { reference: representationRef },
			include: {
				SubmittedByContact: true,
				RepresentedContacts: true
			}
		});

		if (!representation) {
			return notFoundHandler(req, res);
		}

		const originUrl = `/s62a/cases/${id}/manage-representations/${representationRef}`;
		const errors = getRepresentationValidationErrors(representation, originUrl).filter((value) => value !== undefined);

		if (errors.length > 0) {
			addSessionData(req, representationRef, { errors }, 'representations');
			return res.redirect(req.baseUrl);
		}

		if (next) return next();
	};
}

export function buildValidateRedactedFileMiddleware(service: ManageService) {
	return async (
		req: Request<ParamsDictionary, unknown, { errors: ExpressValidationErrors; errorSummary: ErrorSummaryItem[] }>,
		res: Response,
		next: NextFunction
	) => {
		const { db } = service;
		const { representationRef, documentId } = getStringParams(req.params, ['id', 'representationRef', 'documentId']);

		const allRepresentationDocuments = await db.blobRepresentationDocument.findMany({
			where: {
				S62aRepresentation: {
					reference: representationRef
				}
			},
			select: {
				fileName: true
			}
		});

		const allDraftRepresentationDocuments = await db.draftBlobRepresentationDocument.findMany({
			where: {
				sessionKey: req.sessionID,
				NOT: { targetDocumentId: null }
			},
			select: {
				fileName: true
			}
		});

		const document = await db.blobRepresentationDocument.findUnique({
			where: { id: documentId },
			select: { fileName: true }
		});

		if (!document) {
			return notFoundHandler(req, res);
		}

		const redactRepresentationDocument = buildRedactRepresentationDocument(service);

		const handleDuplicateFiles = async (fileAlreadyExistsInFolder: boolean, msg: string) => {
			if (!fileAlreadyExistsInFolder) {
				return false;
			}

			req.body.errors = {
				'upload-form': {
					type: 'field',
					msg,
					path: 'upload-form',
					location: 'body',
					value: ''
				}
			};
			req.body.errorSummary = expressValidationErrorsToGovUkErrorList(req.body.errors);

			await redactRepresentationDocument(req, res, {
				errors: req.body.errors,
				errorSummary: req.body.errorSummary
			});

			return true;
		};

		if (
			await handleDuplicateFiles(
				fileAlreadyExistsInFolder([document.fileName], req.files as Express.Multer.File[]),
				'Original attachment has the same name'
			)
		)
			return;

		if (
			await handleDuplicateFiles(
				fileAlreadyExistsInFolder(
					allRepresentationDocuments.map((doc) => doc.fileName),
					req.files as Express.Multer.File[]
				),
				'An attachment with this name has already been uploaded'
			)
		)
			return;

		if (
			await handleDuplicateFiles(
				fileAlreadyExistsInFolder(
					allDraftRepresentationDocuments.map((doc) => doc.fileName),
					req.files as Express.Multer.File[]
				),
				'A redacted attachment with this name has already been uploaded'
			)
		)
			return;

		if (next) return next();
	};
}

function fileAlreadyExistsInFolder(existing: string[], newFiles: Express.Multer.File[]) {
	return newFiles.map((file) => file.originalname).some((fileName) => existing.includes(fileName));
}
