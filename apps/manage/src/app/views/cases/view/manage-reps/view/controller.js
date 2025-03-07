import { list } from '@pins/dynamic-forms/src/controller.js';
import { notFoundHandler } from '@pins/crowndev-lib/middleware/errors.js';
import { ACCEPT_AND_REDACT, getQuestions } from '@pins/crowndev-lib/forms/representations/questions.js';
import { createJourney, JOURNEY_ID } from './journey.js';
import { JourneyResponse } from '@pins/dynamic-forms/src/journey/journey-response.js';
import { REPRESENTATION_STATUS_ID } from '@pins/crowndev-database/src/seed/data-static.js';
import { representationToManageViewModel } from '@pins/crowndev-lib/forms/representations/view-model.js';

/**
 * @typedef {import('express').Handler} Handler
 */

/**
 * @type {Handler}
 */
export async function viewRepresentation(req, res) {
	validateParams(req.params);

	await renderRepresentation(req, res, {
		accept: REPRESENTATION_STATUS_ID.ACCEPTED,
		acceptAndRedact: ACCEPT_AND_REDACT,
		reject: REPRESENTATION_STATUS_ID.REJECTED
	});
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
		backLink: '.',
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
