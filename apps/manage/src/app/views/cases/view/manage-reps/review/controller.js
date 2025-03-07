import { REPRESENTATION_STATUS, REPRESENTATION_STATUS_ID } from '@pins/crowndev-database/src/seed/data-static.js';
import { ACCEPT_AND_REDACT } from '@pins/crowndev-lib/forms/representations/questions.js';
import { renderRepresentation, validateParams } from '../view/controller.js';
import { addSessionData, clearSessionData, readSessionData } from '@pins/crowndev-lib/util/session.js';
import { yesNoToBoolean } from '@pins/dynamic-forms/src/components/boolean/question.js';
import { createRedactJourney } from './journey.js';
import { JOURNEY_ID } from '../view/journey.js';
import { JourneyResponse } from '@pins/dynamic-forms/src/journey/journey-response.js';
import { wrapPrismaError } from '@pins/crowndev-lib/util/database.js';
import { REDACT_CHARACTER } from '@pins/dynamic-forms/src/components/text-entry-redact/question.js';
import { expressValidationErrorsToGovUkErrorList } from '@pins/dynamic-forms/src/validator/validation-error-handler.js';

/**
 * @typedef {import('express').Handler} Handler
 */

/**
 * @typedef {Object} ReviewControllers
 * @property {Handler} reviewRepresentation
 * @property {Handler} redactRepresentation
 * @property {Handler} redactRepresentationPost
 * @property {Handler} redactConfirmation
 * @property {Handler} acceptRedactedComment
 */

/**
 * @type {Handler}
 */
export async function viewRepresentationAwaitingReview(req, res) {
	validateParams(req.params);

	await renderRepresentation(req, res);
}

/**
 * @param {Object} opts
 * @param {import('@prisma/client').PrismaClient} opts.db
 * @param {import('pino').BaseLogger} opts.logger
 * @returns {ReviewControllers}
 */
export function buildReviewControllers({ db, logger }) {
	/** @type {ReviewControllers} */
	const controllers = {
		async reviewRepresentation(req, res) {
			const { id, representationRef } = validateParams(req.params);
			const { errors = {}, errorSummary = [], wantsToBeHeard, reviewDecision } = req.body;

			if (Object.keys(errors).length > 0) {
				await renderRepresentation(req, res, { errors, errorSummary });
				return;
			}

			/** @type {import('@prisma/client').Prisma.RepresentationUpdateInput} */
			const repUpdate = {};
			if (wantsToBeHeard) {
				repUpdate.wantsToBeHeard = yesNoToBoolean(wantsToBeHeard);
			}
			if (reviewDecision !== ACCEPT_AND_REDACT) {
				repUpdate.statusId = reviewDecision;
			}
			if (Object.keys(repUpdate).length !== 0) {
				logger.info({ representationRef, repUpdate }, 'update representation');
				try {
					await db.representation.update({
						where: { reference: representationRef },
						data: repUpdate
					});
				} catch (error) {
					wrapPrismaError({
						error,
						logger,
						message: 'updating representation',
						logParams: { id, representationRef }
					});
				}
			}
			if (reviewDecision === ACCEPT_AND_REDACT) {
				res.redirect(req.baseUrl + '/redact');
			} else {
				// show 'updated' banner with new status
				const status = REPRESENTATION_STATUS.find((s) => s.id === reviewDecision);
				const statusName = status?.displayName.toLowerCase() || 'reviewed';
				addRepReviewedSession(req, id, statusName);
				res.redirect(req.baseUrl.replace(representationRef + '/review', ''));
			}
		},
		async redactRepresentation(req, res) {
			const { representationRef } = validateParams(req.params);
			const representation = await db.representation.findUnique({
				where: { reference: representationRef },
				select: { comment: true }
			});

			const response = new JourneyResponse(JOURNEY_ID, 'ref-1', {
				comment: representation.comment,
				commentRedacted: readSessionData(req, representationRef, 'commentRedacted', '', 'representations')
			});
			const journey = new createRedactJourney(response, req);
			const section = journey.sections[0];
			const question = section.questions[0];
			const validationErrors = question.checkForValidationErrors(req, res, journey);
			if (validationErrors) {
				question.renderAction(res, validationErrors);
				return;
			}
			const viewModel = question.prepQuestionForRendering(section, journey);
			question.renderAction(res, viewModel);
		},
		async redactRepresentationPost(req, res) {
			const { representationRef } = validateParams(req.params);
			const { comment } = req.body;
			addSessionData(req, representationRef, { commentRedacted: comment }, 'representations');
			if (!comment || !comment.includes(REDACT_CHARACTER)) {
				req.body.errors = {
					comment: {
						msg: 'To accept the representation without redactions, return to the previous page and select "Accept".'
					}
				};
				req.body.errorSummary = expressValidationErrorsToGovUkErrorList(req.body.errors);
				return controllers.redactRepresentation(req, res);
			}
			logger.info('saving redacted comment to session');
			res.redirect(req.baseUrl + '/redact/confirmation');
		},
		async redactConfirmation(req, res) {
			const { representationRef } = validateParams(req.params);
			const commentRedacted = readSessionData(req, representationRef, 'commentRedacted', '', 'representations');
			const answers = res.locals.journeyResponse.answers;
			const originalComment = answers.myselfComment || answers.submitterComment;
			return res.render('views/cases/view/manage-reps/review/redact-confirmation.njk', {
				originalComment,
				commentRedacted,
				reference: representationRef,
				journeyTitle: 'Manage Reps',
				layoutTemplate: 'views/layouts/forms-question.njk',
				backLinkUrl: req.originalUrl?.replace('/confirmation', '')
			});
		},
		async acceptRedactedComment(req, res) {
			const { id, representationRef } = validateParams(req.params);
			const commentRedacted = readSessionData(req, representationRef, 'commentRedacted', '', 'representations');
			try {
				await db.representation.update({
					where: { reference: representationRef },
					data: {
						commentRedacted,
						statusId: REPRESENTATION_STATUS_ID.ACCEPTED
					}
				});
			} catch (error) {
				wrapPrismaError({
					error,
					logger,
					message: 'accepting representation',
					logParams: { id, representationRef }
				});
			}
			clearSessionData(req, representationRef, 'commentRedacted', 'representations');
			const status = REPRESENTATION_STATUS.find((s) => s.id === REPRESENTATION_STATUS_ID.ACCEPTED);
			const statusName = status?.displayName.toLowerCase() || 'reviewed';
			addRepReviewedSession(req, id, statusName);
			res.redirect(req.baseUrl.replace(representationRef + '/review', ''));
		}
	};

	return controllers;
}

/**
 * Redirect between /view and /review based on requiresReview status
 * @type {import('express').Handler}
 */
export function viewReviewRedirect(req, res, next) {
	const originalUrl = req.originalUrl;
	if (!originalUrl.startsWith('/')) {
		// if the URL does not start with / then do not process it
		next();
		return undefined;
	}
	const requiresReview = res.locals?.journeyResponse?.answers?.requiresReview;
	if (originalUrl.endsWith('/view')) {
		if (requiresReview) {
			res.redirect(originalUrl.replace('/view', '/review'));
			return undefined;
		}
	} else if (originalUrl.endsWith('/review')) {
		if (!requiresReview) {
			res.redirect(originalUrl.replace('/review', '/view'));
			return undefined;
		}
	}
	next();
}

/**
 * Add a rep reviewed flag to the session
 *
 * @param {{session?: Object<string, any>}} req
 * @param {string} id
 * @param {string} reviewDecision
 */
function addRepReviewedSession(req, id, reviewDecision) {
	addSessionData(req, id, { representationReviewed: reviewDecision });
}

/**
 * Read a rep reviewed flag from the session
 *
 * @param {{session?: Object<string, any>}} req
 * @param {string} id
 * @returns {string|boolean}
 */
export function readRepReviewedSession(req, id) {
	return readSessionData(req, id, 'representationReviewed', false);
}

/**
 * Clear a rep reviewed flag from the session
 *
 * @param {{session?: Object<string, any>}} req
 * @param {string} id
 */
export function clearRepReviewedSession(req, id) {
	clearSessionData(req, id, 'representationReviewed');
}
