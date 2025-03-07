import { list } from '@pins/dynamic-forms/src/controller.js';
import { notFoundHandler } from '@pins/crowndev-lib/middleware/errors.js';
import { getQuestions } from '@pins/crowndev-lib/forms/representations/questions.js';
import { createJourney, JOURNEY_ID } from './journey.js';
import { JourneyResponse } from '@pins/dynamic-forms/src/journey/journey-response.js';
import {
	editsToDatabaseUpdates,
	representationToManageViewModel
} from '@pins/crowndev-lib/forms/representations/view-model.js';
import { wrapPrismaError } from '@pins/crowndev-lib/util/database.js';

/**
 * @typedef {import('express').Handler} Handler
 */

/**
 * @type {Handler}
 */
export async function viewRepresentation(req, res) {
	validateParams(req.params);

	await renderRepresentation(req, res, {});
}

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
	};
}

/**
 * @param {Object<string, string>} params
 * @returns {{id: string, representationRef: string}}
 */
export function validateParams(params) {
	const id = params.id;
	if (!id) {
		throw new Error('id param required');
	}
	const representationRef = params.representationRef;
	if (!representationRef) {
		throw new Error('representationRef param required');
	}
	return { id, representationRef };
}

/**
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {Object<string, *>} [viewData]
 */
export async function renderRepresentation(req, res, viewData = {}) {
	validateParams(req.params);

	const applicationReference = res.locals?.journeyResponse?.answers?.applicationReference;

	await list(req, res, '', {
		applicationReference,
		requiresReview: res.locals?.journeyResponse?.answers?.requiresReview,
		backLinkUrl: `/cases/${req.params.id}/manage-representations`,
		...viewData
	});
}

/**
 * Fetch the representation from the database to create the journey
 *
 * @param {Object} opts
 * @param {import('@prisma/client').PrismaClient} opts.db
 * @param {import('pino').BaseLogger} opts.logger
 * @returns {import('express').Handler}
 */
export function buildGetJourneyMiddleware({ db, logger }) {
	return async (req, res, next) => {
		const { id, representationRef } = validateParams(req.params);
		logger.info({ id, representationRef }, 'fetching representation');

		const crownDevelopment = await db.crownDevelopment.findUnique({
			where: { id },
			select: { reference: true }
		});
		// Prisma will return null if not found
		if (!crownDevelopment) {
			return notFoundHandler(req, res);
		}

		const representation = await db.representation.findUnique({
			where: { reference: representationRef },
			include: {
				SubmittedFor: true,
				SubmittedByContact: true,
				RepresentedContact: true
			}
		});
		// Prisma will return null if not found
		if (!representation) {
			return notFoundHandler(req, res);
		}
		const answers = representationToManageViewModel(representation, crownDevelopment.reference);
		const questions = getQuestions({
			textOverrides: {
				notStartedText: '-',
				continueButtonText: 'Save',
				changeActionText: 'Edit',
				answerActionText: 'Edit'
			}
		});
		// put these on locals for the list controller
		res.locals.journeyResponse = new JourneyResponse(JOURNEY_ID, 'ref', answers);
		res.locals.journey = createJourney(questions, res.locals.journeyResponse, req);

		if (req.originalUrl !== req.baseUrl) {
			// back link goes to details page
			// only if not on the details page
			res.locals.backLinkUrl = req.baseUrl;
		}

		next();
	};
}
