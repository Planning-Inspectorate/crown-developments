import { notFoundHandler } from '@pins/crowndev-lib/middleware/errors.ts';
import { addSessionData } from '@pins/crowndev-lib/util/session.ts';
import { fileAlreadyExistsInFolder } from '@pins/crowndev-lib/forms/custom-components/representation-attachments/document-validation-util.js';
import { expressValidationErrorsToGovUkErrorList } from '@planning-inspectorate/dynamic-forms/src/validator/validation-error-handler.js';
import { buildReviewControllers } from './review/controller.js';
import { fetchDocumentsInFolderPath } from '@pins/crowndev-lib/forms/custom-components/representation-attachments/upload-documents.js';
import { representationAttachmentsFolderPath } from '@pins/crowndev-lib/util/sharepoint-path.js';
import { validateParams } from './view/controller.js';
import { getStringParam, getStringParams } from '@pins/crowndev-lib/util/params.ts';
import { getRepresentationValidationErrors } from '@pins/crowndev-lib/forms/representations/validation-utils.ts';

/**
 * Validate a representation before it can be accepted, rejected or redacted
 * @param {import('#service').ManageService} services
 * @returns {import('express').Handler}
 */
export function buildValidateRepresentationMiddleware(services) {
	return async (req, res, next) => {
		const { db, logger } = services;
		const { id, representationRef } = getStringParams(req.params, ['id', 'representationRef']);

		logger.info({ representationReference: representationRef }, 'validate representation');
		const representation = await db.representation.findUnique({
			where: { reference: representationRef },
			include: {
				SubmittedByContact: true,
				RepresentedContact: true
			}
		});

		if (!representation) {
			return notFoundHandler(req, res);
		}

		const originUrl = `/cases/${id}/manage-representations/${representationRef}`;
		const errors = getRepresentationValidationErrors(representation, originUrl).filter((value) => value !== undefined);

		if (errors.length > 0) {
			addSessionData(req, representationRef, { errors }, 'representations');
			return res.redirect(req.baseUrl);
		}

		return next();
	};
}

export function buildValidateRedactedFileMiddleware(services) {
	return async (req, res, next) => {
		const { db, getSharePointDrive } = services;
		const { id, representationRef } = validateParams(req.params);
		const itemId = getStringParam(req.params, 'itemId');

		const crownDevelopment = await db.crownDevelopment.findUnique({
			where: { id },
			select: { reference: true }
		});

		if (!crownDevelopment) {
			return notFoundHandler(req, res);
		}

		const document = await db.representationDocument.findFirst({
			where: { itemId: itemId },
			select: { fileName: true }
		});
		if (!document) {
			return notFoundHandler(req, res);
		}

		const caseReference = crownDevelopment.reference;
		const folderPath = `${representationAttachmentsFolderPath(caseReference)}/${representationRef}`;

		const sharePointDrive = getSharePointDrive(req.session);
		const documentsInFolder = await fetchDocumentsInFolderPath(sharePointDrive, folderPath);

		const { redactRepresentationDocument } = buildReviewControllers(services);
		const handleDuplicateFiles = async (fileAlreadyExistsInFolder, msg) => {
			if (!fileAlreadyExistsInFolder) {
				return false;
			}

			req.body.errors = { 'upload-form': { msg } };
			req.body.errorSummary = expressValidationErrorsToGovUkErrorList(req.body.errors);

			await redactRepresentationDocument(req, res, {
				errors: req.body.errors,
				errorSummary: req.body.errorSummary
			});

			return true;
		};

		if (
			await handleDuplicateFiles(
				fileAlreadyExistsInFolder([{ name: document.fileName }], req.files),
				'Original attachment has the same name'
			)
		)
			return;

		if (
			await handleDuplicateFiles(
				fileAlreadyExistsInFolder(documentsInFolder, req.files),
				'File with this name already exists on Representation'
			)
		)
			return;

		return next();
	};
}
