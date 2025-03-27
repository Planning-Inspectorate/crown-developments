import { editsToDatabaseUpdates } from '@pins/crowndev-lib/forms/representations/view-model.js';
import { wrapPrismaError } from '@pins/crowndev-lib/util/database.js';
import { validateParams } from '../view/controller.js';
import { addSessionData, clearSessionData, readSessionData } from '@pins/crowndev-lib/util/session.js';
import { publishedRepresentationsAttachmentsRootFolderPath } from '@pins/crowndev-lib/util/sharepoint-path.js';

/**
 * @param {Object} opts
 * @param {import('@prisma/client').PrismaClient} opts.db
 * @param {import('pino').BaseLogger} opts.logger
 * @param {function(session): SharePointDrive} opts.getSharePointDrive
 * @returns {import('@pins/dynamic-forms/src/controller.js').SaveDataFn}
 */
export function buildUpdateRepresentation({ db, logger, getSharePointDrive }) {
	return async ({ res, req, data }) => {
		const { id, representationRef } = validateParams(req.params);
		const toSave = data?.answers || {};
		if (Object.keys(toSave).length === 0) {
			logger.info({ id, representationRef }, 'no representation updates to apply');
			return;
		}
		/** @type {import('@pins/crowndev-lib/forms/representations/types.js').HaveYourSayManageModel} */
		const fullViewModel = res.locals?.journeyResponse?.answers || {};

		if (toSave.containsAttachments && fullViewModel.sharePointFolderCreated !== 'yes') {
			const sharePointDrive = getSharePointDrive(req.session);
			await addRepresentationFolderToSharepoint(
				sharePointDrive,
				logger,
				fullViewModel.applicationReference,
				representationRef
			);
			toSave['sharePointFolderCreated'] = true;
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
