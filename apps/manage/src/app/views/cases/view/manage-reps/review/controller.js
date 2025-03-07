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
 * @type {Handler}
 */
export async function viewRepresentationAwaitingReview(req, res) {
	validateParams(req.params);

	await renderRepresentation(req, res, {
		accept: REPRESENTATION_STATUS_ID.ACCEPTED,
		acceptAndRedact: ACCEPT_AND_REDACT,
		reject: REPRESENTATION_STATUS_ID.REJECTED
	});
}

/**
 * @param {Object} opts
 * @param {import('@prisma/client').PrismaClient} opts.db
 * @param {import('pino').BaseLogger} opts.logger
 * @returns {{reviewRepresentation: Handler, redactRepresentation: Handler, redactRepresentationPost: Handler, redactCheckYourAnswers: Handler, acceptRedactedComment: Handler}}
 */
export function buildReviewControllers({ db, logger }) {
	async function redactRepresentation(req, res) {
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
	}
	return {
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
				addRepUpdatedSession(req, id, statusName);
				res.redirect(req.baseUrl.replace(representationRef + '/review', ''));
			}
		},
		redactRepresentation,
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
				return redactRepresentation(req, res);
			}
			logger.info('saving redacted comment to session');
			res.redirect(req.baseUrl + '/redact/confirmation');
		},
		async redactCheckYourAnswers(req, res) {
			const { representationRef } = validateParams(req.params);
			const commentRedacted = readSessionData(req, representationRef, 'commentRedacted', '', 'representations');
			const answers = res.locals.journeyResponse.answers;
			const originalComment = answers.myselfComment || answers.submitterComment;
			return res.render('views/cases/view/manage-reps/review/redact-confirmation.njk', {
				originalComment,
				commentRedacted,
				reference: representationRef,
				journeyTitle: 'Manage Reps',
				layoutTemplate: 'views/layouts/forms-question.njk'
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
			addRepUpdatedSession(req, id, statusName);
			res.redirect(req.baseUrl.replace(representationRef + '/review/redact', ''));
		}
	};
}

/**
 * Redirect between /view and /review based on requiresReview status
 * @type {import('express').Handler}
 */
export function viewReviewRedirect(req, res, next) {
	const requiresReview = res.locals?.journeyResponse?.answers?.requiresReview;
	if (req.originalUrl.endsWith('/view')) {
		if (requiresReview) {
			res.redirect(req.originalUrl.replace('/view', '/review'));
			return undefined;
		}
	} else if (req.originalUrl.endsWith('/review')) {
		if (!requiresReview) {
			res.redirect(req.originalUrl.replace('/review', '/view'));
			return undefined;
		}
	}
	next();
}

/**
 * Add a rep updated flag to the session
 *
 * @param {{session?: Object<string, any>}} req
 * @param {string} id
 * @param {string} reviewDecision
 */
function addRepUpdatedSession(req, id, reviewDecision) {
	addSessionData(req, id, { representationUpdated: reviewDecision });
}

/**
 * Read a rep updated flag from the session
 *
 * @param {{session?: Object<string, any>}} req
 * @param {string} id
 * @returns {string|boolean}
 */
export function readRepUpdatedSession(req, id) {
	return readSessionData(req, id, 'representationUpdated', false);
}

/**
 * Clear a rep updated flag from the session
 *
 * @param {{session?: Object<string, any>}} req
 * @param {string} id
 */
export function clearRepUpdatedSession(req, id) {
	clearSessionData(req, id, 'representationUpdated');
}
