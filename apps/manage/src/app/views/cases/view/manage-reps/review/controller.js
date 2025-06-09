import { REPRESENTATION_STATUS_ID } from '@pins/crowndev-database/src/seed/data-static.js';
import { ACCEPT_AND_REDACT } from '@pins/crowndev-lib/forms/representations/questions.js';
import { renderRepresentation, validateParams } from '../view/controller.js';
import { addSessionData, clearSessionData, readSessionData } from '@pins/crowndev-lib/util/session.js';
import { createRedactJourney } from './journey.js';
import { JOURNEY_ID } from '../view/journey.js';
import { JourneyResponse } from '@pins/dynamic-forms/src/journey/journey-response.js';
import { wrapPrismaError } from '@pins/crowndev-lib/util/database.js';
import { REDACT_CHARACTER } from '@pins/dynamic-forms/src/components/text-entry-redact/question.js';
import { expressValidationErrorsToGovUkErrorList } from '@pins/dynamic-forms/src/validator/validation-error-handler.js';
import { notFoundHandler } from '@pins/crowndev-lib/middleware/errors.js';

/**
 * @typedef {import('express').Handler} Handler
 */

/**
 * @typedef {Object} ReviewControllers
 * @property {Handler} reviewRepresentationSubmission
 * @property {Handler} reviewRepresentation
 * @property {Handler} representationTaskList
 * @property {Handler} reviewRepresentationComment
 * @property {Handler} reviewRepresentationCommentDecision
 * @property {Handler} redactRepresentation
 * @property {Handler} redactRepresentationPost
 * @property {Handler} redactConfirmation
 * @property {Handler} acceptRedactedComment
 * @property {Handler} reviewRepresentationDocument
 */

/**
 * @type {Handler}
 */
export async function viewRepresentationAwaitingReview(req, res) {
	validateParams(req.params);

	await renderRepresentation(req, res);
}

/**
 * @param {import('#service').ManageService} service
 * @returns {ReviewControllers}
 */
export function buildReviewControllers({ db, logger }) {
	/** @type {ReviewControllers} */
	const controllers = {
		async reviewRepresentationSubmission(req, res) {
			const { id, representationRef } = validateParams(req.params);
			const representation = await db.representation.findUnique({
				where: { reference: representationRef },
				select: { commentStatus: true }
			});
			const reviewDecision =
				representation.commentStatus === ACCEPT_AND_REDACT
					? REPRESENTATION_STATUS_ID.ACCEPTED
					: representation.commentStatus;

			/** @type {import('@prisma/client').Prisma.RepresentationUpdateInput} */
			const repUpdate = {};
			repUpdate.statusId = reviewDecision;
			logger.info({ representationRef, repUpdate }, 'submit representation review');
			try {
				await db.representation.update({
					where: { reference: representationRef },
					data: repUpdate
				});
			} catch (error) {
				wrapPrismaError({
					error,
					logger,
					message: 'submitted representation review',
					logParams: { id, representationRef }
				});
			}

			const statusName = getStatusDisplayName(reviewDecision);
			addRepReviewedSession(req, id, statusName);
			res.redirect(req.originalUrl?.replace(`/${representationRef}/review/task-list`, ''));
		},
		async reviewRepresentation(req, res) {
			const { errors = {}, errorSummary = [] } = req.body;

			if (Object.keys(errors).length > 0) {
				await renderRepresentation(req, res, { errors, errorSummary });
				return;
			}

			res.redirect(req.baseUrl + '/task-list');
		},
		async representationTaskList(req, res) {
			const { representationRef } = validateParams(req.params);
			const representation = await db.representation.findUnique({
				where: { reference: representationRef },
				include: { Attachments: true }
			});

			const commentStatusTag = getReviewTaskStatus(representation?.commentStatus, false);
			const representationAttachments = representation?.Attachments || [];
			const documents = representationAttachments.map((attachment) => {
				return {
					title: {
						text: attachment.fileName
					},
					href:
						representation?.commentStatus !== REPRESENTATION_STATUS_ID.REJECTED
							? `${req.originalUrl}/${attachment.itemId}`
							: '',
					status: {
						tag: getReviewTaskStatus(attachment.statusId, attachment.redactedItemId && attachment.redactedFileName)
					}
				};
			});

			const taskStatusList = [
				representation?.commentStatus,
				...representationAttachments.map((attachment) => attachment.statusId)
			];

			return res.render('views/cases/view/manage-reps/review/task-list.njk', {
				reference: representationRef,
				commentStatusTag,
				documents: representation.containsAttachments === true ? documents : [],
				reviewComplete: isReviewComplete(taskStatusList),
				journeyTitle: 'Manage Reps',
				layoutTemplate: 'views/layouts/forms-question.njk',
				backLinkUrl: req.originalUrl?.replace('/task-list', '')
			});
		},
		async reviewRepresentationComment(req, res, viewData = {}) {
			const { representationRef } = validateParams(req.params);
			const representation = await db.representation.findUnique({
				where: { reference: representationRef },
				select: { comment: true, commentStatus: true }
			});
			return res.render('views/cases/view/manage-reps/review/review-comment.njk', {
				reference: representationRef,
				comment: representation.comment,
				commentStatus:
					readSessionData(req, representationRef, 'commentStatus', '', 'representations') ||
					representation.commentStatus,
				accept: REPRESENTATION_STATUS_ID.ACCEPTED,
				acceptAndRedact: ACCEPT_AND_REDACT,
				reject: REPRESENTATION_STATUS_ID.REJECTED,
				journeyTitle: 'Manage Reps',
				layoutTemplate: 'views/layouts/forms-question.njk',
				backLinkUrl: req.originalUrl?.replace('/comment', ''),
				...viewData
			});
		},
		async reviewRepresentationCommentDecision(req, res) {
			const { id, representationRef } = validateParams(req.params);
			const { reviewCommentDecision } = req.body;
			if (!reviewCommentDecision) {
				req.body.errors = {
					reviewCommentDecision: {
						msg: 'Select the review decision'
					}
				};
				req.body.errorSummary = expressValidationErrorsToGovUkErrorList(req.body.errors);
				await controllers.reviewRepresentationComment(req, res, {
					errors: req.body.errors,
					errorSummary: req.body.errorSummary
				});
				return;
			}

			/** @type {import('@prisma/client').Prisma.RepresentationUpdateInput} */
			const repUpdate = {};
			if (reviewCommentDecision !== ACCEPT_AND_REDACT) {
				repUpdate.commentStatus = reviewCommentDecision;
			} else {
				addSessionData(req, representationRef, { commentStatus: reviewCommentDecision }, 'representations');
			}
			if (Object.keys(repUpdate).length !== 0) {
				const representation = await db.representation.findUnique({
					where: { reference: representationRef },
					select: { id: true, commentStatus: true }
				});
				const commentStatusBeforeUpdate = representation?.commentStatus;

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

				const isRejected = reviewCommentDecision === REPRESENTATION_STATUS_ID.REJECTED;
				const wasRejected = commentStatusBeforeUpdate === REPRESENTATION_STATUS_ID.REJECTED;

				if (isRejected || (wasRejected && !isRejected)) {
					await updateDocumentStatus(db, logger, id, representationRef, representation, isRejected);
				}
			}

			if (reviewCommentDecision === ACCEPT_AND_REDACT) {
				res.redirect(req.originalUrl + '/redact');
			} else {
				res.redirect(req.originalUrl?.replace('/comment', ''));
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
			res.redirect(req.originalUrl + '/confirmation');
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
			const representation = await db.representation.findUnique({
				where: { reference: representationRef },
				select: { id: true, commentStatus: true }
			});
			const commentStatusBeforeUpdate = representation?.commentStatus;

			try {
				await db.representation.update({
					where: { reference: representationRef },
					data: {
						commentRedacted,
						commentStatus: ACCEPT_AND_REDACT
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

			if (commentStatusBeforeUpdate === REPRESENTATION_STATUS_ID.REJECTED) {
				await updateDocumentStatus(db, logger, id, representationRef, representation, false);
			}

			clearSessionData(req, representationRef, 'commentRedacted', 'representations');
			clearSessionData(req, representationRef, 'commentStatus', 'representations');
			res.redirect(req.originalUrl?.replace('/comment/redact/confirmation', ''));
		},
		async reviewRepresentationDocument(req, res, viewData = {}) {
			const { representationRef } = validateParams(req.params);
			const itemId = req.params.itemId;
			if (!itemId) {
				throw new Error('itemId param required');
			}

			const document = await db.representationDocument.findFirst({
				where: { itemId: itemId },
				select: { fileName: true }
			});
			if (document === null) {
				return notFoundHandler(req, res);
			}

			return res.render('views/cases/view/manage-reps/review/review-document.njk', {
				reference: representationRef,
				fileName: document?.fileName,
				accept: REPRESENTATION_STATUS_ID.ACCEPTED,
				acceptAndRedact: ACCEPT_AND_REDACT,
				reject: REPRESENTATION_STATUS_ID.REJECTED,
				journeyTitle: 'Manage Reps',
				layoutTemplate: 'views/layouts/forms-question.njk',
				backLinkUrl: req.originalUrl?.replace(`/${itemId}`, ''),
				...viewData
			});
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
	} else if (originalUrl.endsWith('/edit')) {
		res.redirect(originalUrl.replace('/edit', '/view'));
		return undefined;
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

/**
 * Generate govUk tag information based on review task status
 *
 * @param {string} status
 * @param {boolean} isRedacted
 * @returns {{text: (string), classes: string}|{text: string, classes: string}}
 */
function getReviewTaskStatus(status, isRedacted) {
	switch (status) {
		case REPRESENTATION_STATUS_ID.ACCEPTED:
			return {
				text: isRedacted ? 'Accepted and redacted' : 'Accepted',
				classes: 'govuk-tag--green'
			};
		case ACCEPT_AND_REDACT:
			return {
				text: 'Accepted and redacted',
				classes: 'govuk-tag--green'
			};
		case REPRESENTATION_STATUS_ID.REJECTED:
			return {
				text: 'Rejected',
				classes: 'govuk-tag--red'
			};
		default:
			return {
				text: 'Incomplete',
				classes: 'govuk-tag--blue'
			};
	}
}

async function updateDocumentStatus(db, logger, id, representationRef, representation, isRejected) {
	try {
		await db.representationDocument.updateMany({
			where: { representationId: representation.id },
			data: {
				statusId: isRejected ? REPRESENTATION_STATUS_ID.REJECTED : REPRESENTATION_STATUS_ID.AWAITING_REVIEW
			}
		});
	} catch (error) {
		wrapPrismaError({
			error,
			logger,
			message: 'updating representation documents',
			logParams: { id, representationRef }
		});
	}
}

/**
 * Determine whether a review can be submitted
 *
 * @param {Array.<string>} taskStatusList
 * @returns {boolean}
 */
function isReviewComplete(taskStatusList) {
	const validStatuses = new Set([
		REPRESENTATION_STATUS_ID.ACCEPTED,
		ACCEPT_AND_REDACT,
		REPRESENTATION_STATUS_ID.REJECTED
	]);

	return taskStatusList.every((status) => validStatuses.has(status));
}

/**
 * Returns status display name for banner
 *
 * @param {string} reviewDecision
 * @returns {string}
 */
function getStatusDisplayName(reviewDecision) {
	const statusDisplayMap = new Map([
		[REPRESENTATION_STATUS_ID.ACCEPTED, 'accepted'],
		[ACCEPT_AND_REDACT, 'accepted'],
		[REPRESENTATION_STATUS_ID.REJECTED, 'rejected']
	]);

	return statusDisplayMap.get(reviewDecision) ?? '';
}
