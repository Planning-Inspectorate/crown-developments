import { editsToDatabaseUpdates } from '@pins/crowndev-lib/forms/representations/view-model.js';
import { wrapPrismaError } from '@pins/crowndev-lib/util/database.js';
import { validateParams } from '../view/controller.js';
import { addSessionData, clearSessionData, readSessionData } from '@pins/crowndev-lib/util/session.js';

/**
 * @param {Object} opts
 * @param {import('@prisma/client').PrismaClient} opts.db
 * @param {import('pino').BaseLogger} opts.logger
 * @returns {import('@pins/dynamic-forms/src/controller.js').SaveDataFn}
 */
export function buildUpdateRepresentation({ db, logger }) {
	return async ({ res, req, data }) => {
		const { id, representationRef } = validateParams(req.params);
		const toSave = data?.answers || {};
		if (Object.keys(toSave).length === 0) {
			logger.info({ id, representationRef }, 'no representation updates to apply');
			return;
		}
		/** @type {import('@pins/crowndev-lib/forms/representations/types.js').HaveYourSayManageModel} */
		const fullViewModel = res.locals?.journeyResponse?.answers || {};
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
