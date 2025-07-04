import { list } from '@planning-inspectorate/dynamic-forms/src/controller.js';
import { notFoundHandler } from '@pins/crowndev-lib/middleware/errors.js';
import { getQuestions } from '@pins/crowndev-lib/forms/representations/questions.js';
import { createJourney, JOURNEY_ID } from './journey.js';
import { JourneyResponse } from '@planning-inspectorate/dynamic-forms/src/journey/journey-response.js';
import { representationToManageViewModel } from '@pins/crowndev-lib/forms/representations/view-model.js';
import { clearRepUpdatedSession, readRepUpdatedSession } from '../edit/controller.js';
import { clearSessionData, readSessionData } from '@pins/crowndev-lib/util/session.js';
import { REPRESENTATION_STATUS_ID } from '@pins/crowndev-database/src/seed/data-static.js';

/**
 * @typedef {import('express').Handler} Handler
 */

/**
 * @type {Handler}
 */
export async function viewRepresentation(req, res) {
	validateParams(req.params);

	await renderRepresentation(req, res);
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
	const { representationRef } = validateParams(req.params);

	// Show publish case validation errors
	const errors = readSessionData(req, representationRef, 'errors', [], 'representations');
	if (errors.length > 0) {
		res.locals.errorSummary = errors;
	}
	clearSessionData(req, representationRef, 'errors', 'representations');

	const representationUpdated = readRepUpdatedSession(req, representationRef);
	clearRepUpdatedSession(req, representationRef);

	await list(req, res, '', {
		representationRef,
		requiresReview: res.locals?.journeyResponse?.answers?.requiresReview,
		backLinkUrl: `/cases/${req.params.id}/manage-representations`,
		representationUpdated,
		...viewData
	});
}

/**
 * Fetch the representation from the database to create the journey
 *
 * @param {import('#service').ManageService} service
 * @returns {import('express').Handler}
 */
export function buildGetJourneyMiddleware({ db, logger, isRepsUploadDocsLive }) {
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
				SubmittedByContact: {
					include: {
						Address: true
					}
				},
				RepresentedContact: true,
				Attachments: true
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
			},
			actionOverrides: {
				statusShouldShowManageAction: true,
				redactedCommentShowManageAction: answers?.statusId === REPRESENTATION_STATUS_ID.ACCEPTED,
				canEditAttachmentsUploaded: answers?.statusId !== REPRESENTATION_STATUS_ID.REJECTED,
				taskListUrl: req.baseUrl + '/manage/task-list'
			}
		});
		// put these on locals for the list controller
		res.locals.journeyResponse = new JourneyResponse(JOURNEY_ID, 'ref', answers);
		res.locals.journey = createJourney(questions, res.locals.journeyResponse, req, isRepsUploadDocsLive);

		if (req.originalUrl !== req.baseUrl) {
			// back link goes to details page
			// only if not on the details page
			res.locals.backLinkUrl = req.baseUrl + '/view';
		}

		next();
	};
}
