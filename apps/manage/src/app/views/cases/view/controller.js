import { list } from '@pins/dynamic-forms/src/controller.js';
import { notFoundHandler } from '@pins/crowndev-lib/middleware/errors.js';
import { crownDevelopmentToViewModel } from './view-model.js';
import { getQuestions } from './questions.js';
import { createJourney, JOURNEY_ID } from './journey.js';
import { JourneyResponse } from '@pins/dynamic-forms/src/journey/journey-response.js';

/**
 * @type {import('express').Handler}
 */
export async function viewCaseDetails(req, res) {
	const reference = res.locals?.journeyResponse?.answers?.reference;
	const id = req.params.id;
	if (!id) {
		throw new Error('id param required');
	}

	await list(req, res, '', { reference, hideButton: true, hideStatus: true });
}

/**
 * Fetch the case details from the database to create the journey
 *
 * @param {Object} opts
 * @param {import('@prisma/client').PrismaClient} db
 * @param {import('pino').BaseLogger} logger
 * @returns {import('express').Handler}
 */
export function buildGetJourneyMiddleware({ db, logger }) {
	return async (req, res, next) => {
		const id = req.params.id;
		if (!id) {
			throw new Error('id param required');
		}
		logger.info({ id }, 'view case');

		const crownDevelopment = await db.crownDevelopment.findUnique({
			where: { id },
			include: {
				ApplicantContact: { include: { Address: true } },
				AgentContact: { include: { Address: true } },
				Category: { include: { ParentCategory: true } },
				Event: true,
				Lpa: { include: { Address: true } },
				SiteAddress: true
			}
		});
		if (crownDevelopment === null) {
			return notFoundHandler(req, res);
		}
		const answers = crownDevelopmentToViewModel(crownDevelopment);
		const questions = getQuestions();
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
