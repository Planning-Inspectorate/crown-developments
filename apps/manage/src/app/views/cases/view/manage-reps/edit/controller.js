import { editsToDatabaseUpdates } from '@pins/crowndev-lib/forms/representations/view-model.js';
import { wrapPrismaError } from '@pins/crowndev-lib/util/database.js';
import { validateParams } from '../view/controller.js';
import { addSessionData, clearSessionData, readSessionData } from '@pins/crowndev-lib/util/session.js';
import { publishedRepresentationsAttachmentsRootFolderPath } from '@pins/crowndev-lib/util/sharepoint-path.js';
import { BOOLEAN_OPTIONS } from '@planning-inspectorate/dynamic-forms/src/components/boolean/question.js';
import {
	deleteRepresentationAttachmentsFolder,
	moveAttachmentsToCaseFolder
} from '@pins/crowndev-lib/util/handle-attachments.js';
import { REPRESENTATION_STATUS_ID } from '@pins/crowndev-database/src/seed/data-static.js';

/**
 * @param {import('#service').ManageService} service
 * @param {import('@pins/crowndev-lib/util/handle-attachments.js').MoveAttachmentsToCaseFolderFn} [moveAttachmentsToCaseFolderFn] Optional function to move attachments to case folder for testing
 * @param {import('@pins/crowndev-lib/util/handle-attachments.js').DeleteRepresentationAttachmentsFolderFn} [deleteRepresentationAttachmentsFolderFn] Optional function to delete representation attachments folder for testing
 * @returns {import('@planning-inspectorate/dynamic-forms/src/controller.js').SaveDataFn}
 */
export function buildUpdateRepresentation(
	{ db, logger, getSharePointDrive },
	moveAttachmentsToCaseFolderFn = moveAttachmentsToCaseFolder,
	deleteRepresentationAttachmentsFolderFn = deleteRepresentationAttachmentsFolder
) {
	return async ({ res, req, data }) => {
		const { id, representationRef } = validateParams(req.params);
		const toSave = data?.answers || {};
		const sharePointDrive = getSharePointDrive(req.session);
		if (Object.keys(toSave).length === 0) {
			logger.info({ id, representationRef }, 'no representation updates to apply');
			return;
		}
		/** @type {import('@pins/crowndev-lib/forms/representations/types.js').HaveYourSayManageModel} */
		const fullViewModel = res.locals?.journeyResponse?.answers || {};

		if (toSave.containsAttachments && fullViewModel.sharePointFolderCreated !== BOOLEAN_OPTIONS.YES) {
			await addRepresentationFolderToSharepoint(
				sharePointDrive,
				logger,
				fullViewModel.applicationReference,
				representationRef
			);
			toSave['sharePointFolderCreated'] = true;
		}

		const hasAttachments =
			(toSave.myselfAttachments && toSave.myselfAttachments.length > 0) ||
			(toSave.submitterAttachments && toSave.submitterAttachments.length > 0);

		if (hasAttachments) {
			const attachmentsToSave = toSave.myselfAttachments ?? toSave.submitterAttachments;
			await handleMoveAttachmentsToCaseFolder(
				req,
				attachmentsToSave,
				moveAttachmentsToCaseFolderFn,
				db,
				sharePointDrive,
				logger,
				fullViewModel,
				representationRef
			);

			try {
				await db.$transaction(async ($tx) => {
					const representation = await $tx.representation.findUnique({
						where: {
							reference: representationRef
						}
					});
					await $tx.representationDocument.createMany({
						data: attachmentsToSave.map((attachment) => ({
							representationId: representation.id,
							fileName: attachment.fileName,
							itemId: attachment.itemId,
							statusId: REPRESENTATION_STATUS_ID.AWAITING_REVIEW
						}))
					});
				});
			} catch (err) {
				wrapPrismaError({
					error: err,
					logger,
					message: 'adding representation attachments',
					logParams: { id, representationRef }
				});
			}

			await handleDeleteAttachmentsFolder(
				req,
				res,
				deleteRepresentationAttachmentsFolderFn,
				sharePointDrive,
				logger,
				fullViewModel,
				representationRef,
				'Error deleting representation attachments folder'
			);
		}

		const hasWithdrawalRequests = toSave.withdrawalRequests && toSave.withdrawalRequests.length > 0;
		if (hasWithdrawalRequests) {
			const attachmentsToSave = toSave.withdrawalRequests;
			await handleMoveAttachmentsToCaseFolder(
				req,
				attachmentsToSave,
				moveAttachmentsToCaseFolderFn,
				db,
				sharePointDrive,
				logger,
				fullViewModel,
				representationRef
			);

			try {
				await db.$transaction(async ($tx) => {
					const representation = await $tx.representation.findUnique({
						where: {
							reference: representationRef
						}
					});
					await $tx.withdrawalRequestDocument.createMany({
						data: attachmentsToSave.map((attachment) => ({
							representationId: representation.id,
							fileName: attachment.fileName,
							itemId: attachment.itemId
						}))
					});
				});
			} catch (err) {
				wrapPrismaError({
					error: err,
					logger,
					message: 'adding withdrawal requests',
					logParams: { id, representationRef }
				});
			}

			await handleDeleteAttachmentsFolder(
				req,
				res,
				deleteRepresentationAttachmentsFolderFn,
				sharePointDrive,
				logger,
				fullViewModel,
				representationRef,
				'Error deleting withdrawal requests folder'
			);
		}

		/** @type {import('@prisma/client').Prisma.RepresentationUpdateInput} */
		const updateInput = editsToDatabaseUpdates(toSave, fullViewModel);
		logger.info({ id, representationRef, fields: Object.keys(toSave) }, 'update representation input');

		try {
			await db.representation.update({
				where: { reference: representationRef },
				data: updateInput
			});
		} catch (error) {
			wrapPrismaError({
				error,
				logger,
				message: 'updating representation',
				logParams: { id, representationRef }
			});
		}
		clearSessionData(req, representationRef, req.params.section, 'files');
		addRepUpdatedSession(req, representationRef);
	};
}

/**
 * Add folder to sharepoint for representation
 *
 * @param {SharePointDrive} sharePointDrive
 * @param {import('pino').BaseLogger} logger
 * @param {string} applicationReference
 * @param {string} representationRef
 */
async function addRepresentationFolderToSharepoint(sharePointDrive, logger, applicationReference, representationRef) {
	try {
		const folderPath = publishedRepresentationsAttachmentsRootFolderPath(applicationReference);
		await sharePointDrive.addNewFolder(folderPath, representationRef);
	} catch (error) {
		logger.error(
			{ error, applicationReference, representationRef },
			'error creating new sharepoint folder for representation'
		);
		throw new Error('Error encountered during sharepoint folder creation');
	}
}

/**
 * Handle moving attachments to case folder in sharepoint
 *
 * @param {import('express').Request} req
 * @param {Array} attachmentsToSave
 * @param {import('@pins/crowndev-lib/util/handle-attachments.js').MoveAttachmentsToCaseFolderFn} moveAttachmentsToCaseFolderFn
 * @param {import('@prisma/client').PrismaClient} db
 * @param {SharePointDrive} sharePointDrive
 * @param {import('pino').BaseLogger} logger
 * @param {import('@pins/crowndev-lib/forms/representations/types.js').HaveYourSayManageModel} fullViewModel
 * @param {string} representationRef
 * @returns {Promise<void>}
 */
async function handleMoveAttachmentsToCaseFolder(
	req,
	attachmentsToSave,
	moveAttachmentsToCaseFolderFn,
	db,
	sharePointDrive,
	logger,
	fullViewModel,
	representationRef
) {
	await moveAttachmentsToCaseFolderFn({
		service: { db, logger, sharePointDrive },
		applicationReference: fullViewModel.applicationReference,
		representationReference: representationRef,
		representationAttachments: attachmentsToSave
	});
}

/**
 * Handle deletion of attachments from sharepoint
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('@pins/crowndev-lib/util/handle-attachments.js').DeleteRepresentationAttachmentsFolderFn} deleteRepresentationAttachmentsFolderFn
 * @param {SharePointDrive} sharePointDrive
 * @param {import('pino').BaseLogger} logger
 * @param {import('@pins/crowndev-lib/forms/representations/types.js').HaveYourSayManageModel} fullViewModel
 * @param {string} representationRef
 * @param {string} errorMsg
 * @returns {Promise<void>}
 */
async function handleDeleteAttachmentsFolder(
	req,
	res,
	deleteRepresentationAttachmentsFolderFn,
	sharePointDrive,
	logger,
	fullViewModel,
	representationRef,
	errorMsg
) {
	try {
		await deleteRepresentationAttachmentsFolderFn(
			{
				service: { logger, sharePointDrive },
				applicationReference: fullViewModel.applicationReference,
				representationReference: representationRef,
				appName: 'manage'
			},
			req,
			res
		);
	} catch (error) {
		logger.warn({ error, applicationReference: fullViewModel.applicationReference, representationRef }, errorMsg);
	}
}

/**
 * Add a rep updated flag to the session
 *
 * @param {{session?: Object<string, any>}} req
 * @param {string} id
 */
function addRepUpdatedSession(req, id) {
	addSessionData(req, id, { representationUpdated: true }, 'representations');
}

/**
 * Read a rep updated flag from the session
 *
 * @param {{session?: Object<string, any>}} req
 * @param {string} id
 * @returns {string|boolean}
 */
export function readRepUpdatedSession(req, id) {
	return readSessionData(req, id, 'representationUpdated', false, 'representations');
}

/**
 * Clear a rep updated flag from the session
 *
 * @param {{session?: Object<string, any>}} req
 * @param {string} id
 */
export function clearRepUpdatedSession(req, id) {
	clearSessionData(req, id, 'representationUpdated', 'representations');
}
