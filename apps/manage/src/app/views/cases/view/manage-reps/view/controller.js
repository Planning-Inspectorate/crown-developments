import { list } from '@pins/dynamic-forms/src/controller.js';
import { notFoundHandler } from '@pins/crowndev-lib/middleware/errors.js';
import { ACCEPT_AND_REDACT, getQuestions } from '@pins/crowndev-lib/forms/representations/questions.js';
import { createJourney, createRedactJourney, JOURNEY_ID } from './journey.js';
import { JourneyResponse } from '@pins/dynamic-forms/src/journey/journey-response.js';
import { REPRESENTATION_STATUS, REPRESENTATION_STATUS_ID } from '@pins/crowndev-database/src/seed/data-static.js';
import { addSessionData, clearSessionData, readSessionData } from '@pins/crowndev-lib/util/session.js';
import { BOOLEAN_OPTIONS, booleanToYesNoOrNull } from '@pins/dynamic-forms/src/components/boolean/question.js';
import { Prisma } from '@prisma/client';

/**
 * @typedef {import('express').Handler} Handler
 */

/**
 * @type {import('express').Handler}
 */
export async function viewRepresentation(req, res) {
	const id = req.params.id;
	if (!id) {
		throw new Error('id param required');
	}

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
 * @returns {{reviewRepresentation: Handler, redactRepresentation: Handler, redactRepresentationPost: Handler, redactCheckYourAnswers: Handler, acceptRedactedComment: Handler, updateRepresentation: import('@pins/dynamic-forms/src/controller.js').SaveDataFn}}
 */
export function buildViewControllers({ db, logger }) {
	return {
		async reviewRepresentation(req, res) {
			const { id, repId } = validateParams(req.params);
			const { errors = {}, errorSummary = [], wantsToBeHeard, reviewDecision } = req.body;

			if (Object.keys(errors).length > 0) {
				await renderRepresentation(req, res, { errors, errorSummary });
				return;
			}

			/** @type {import('@prisma/client').Prisma.RepresentationUpdateInput} */
			const repUpdate = {};
			if (wantsToBeHeard) {
				repUpdate.wantsToBeHeard = wantsToBeHeard === BOOLEAN_OPTIONS.YES;
			}
			if (reviewDecision !== ACCEPT_AND_REDACT) {
				repUpdate.statusId = reviewDecision;
			}
			if (Object.keys(repUpdate).length !== 0) {
				logger.info({ repId, repUpdate }, 'update rep');
				await db.representation.update({
					where: { reference: repId },
					data: repUpdate
				});
			}
			if (reviewDecision === ACCEPT_AND_REDACT) {
				res.redirect(req.baseUrl + '/redact');
			} else {
				// show 'updated' banner with new status
				const status = REPRESENTATION_STATUS.find((s) => s.id === reviewDecision);
				const statusName = status?.displayName.toLowerCase() || 'reviewed';
				addRepUpdatedSession(req, id, statusName);
				res.redirect(req.baseUrl.replace(repId, ''));
			}
		},
		async redactRepresentation(req, res) {
			const { repId } = validateParams(req.params);
			const representation = await db.representation.findUnique({
				where: { reference: repId },
				select: { comment: true }
			});

			const response = new JourneyResponse(JOURNEY_ID, 'ref-1', {
				comment: representation.comment,
				commentRedacted: readSessionData(req, repId, 'commentRedacted', '', 'representations')
			});
			const journey = new createRedactJourney(response, req);
			const section = journey.sections[0];
			const question = section.questions[0];
			const viewModel = question.prepQuestionForRendering(section, journey);
			question.renderAction(res, viewModel);
		},
		async redactRepresentationPost(req, res) {
			const { repId } = validateParams(req.params);
			const { comment } = req.body;
			addSessionData(req, repId, { commentRedacted: comment }, 'representations');
			logger.info('saving redacted comment to session');
			res.redirect(req.baseUrl + '/redact/check-your-answers');
		},
		async redactCheckYourAnswers(req, res) {
			const { repId } = validateParams(req.params);
			const commentRedacted = readSessionData(req, repId, 'commentRedacted', '', 'representations');
			const originalComment = res.locals.journeyResponse.answers.comment;
			return res.render('views/cases/view/manage-reps/view/redact-check-your-answers.njk', {
				originalComment,
				commentRedacted,
				reference: repId,
				journeyTitle: 'Manage Reps',
				layoutTemplate: 'views/layouts/forms-question.njk'
			});
		},
		async acceptRedactedComment(req, res) {
			const { id, repId } = validateParams(req.params);
			const commentRedacted = readSessionData(req, repId, 'commentRedacted', '', 'representations');
			await db.representation.update({
				where: { reference: repId },
				data: {
					commentRedacted,
					statusId: REPRESENTATION_STATUS_ID.ACCEPTED
				}
			});
			clearSessionData(req, repId, 'comment', 'representations');
			const status = REPRESENTATION_STATUS.find((s) => s.id === REPRESENTATION_STATUS_ID.ACCEPTED);
			const statusName = status?.displayName.toLowerCase() || 'reviewed';
			addRepUpdatedSession(req, id, statusName);
			res.redirect(req.baseUrl.replace(repId, ''));
		},
		/** @type {import('@pins/dynamic-forms/src/controller.js').SaveDataFn} */
		async updateRepresentation({ req, data }) {
			const { id, repId } = validateParams(req.params);
			const toSave = data?.answers || {};
			if (Object.keys(toSave).length === 0) {
				logger.info({ id }, 'no representation updates to apply');
				return;
			}
			/** @type {import('@prisma/client').Prisma.RepresentationUpdateInput} */
			const updateInput = {};
			for (const [k, v] of Object.entries(toSave)) {
				if (v === BOOLEAN_OPTIONS.YES || v === BOOLEAN_OPTIONS.NO) {
					updateInput[k] = v === BOOLEAN_OPTIONS.YES;
				} else {
					updateInput[k] = v;
				}
			}
			logger.info({ fields: Object.keys(toSave) }, 'update representation input');

			try {
				await db.representation.update({
					where: { reference: repId },
					data: updateInput
				});
			} catch (e) {
				// don't show Prisma errors to the user
				if (e instanceof Prisma.PrismaClientKnownRequestError) {
					logger.error({ id, error: e }, 'error updating representation');
					throw new Error(`Error updating representation (${e.code})`);
				}
				if (e instanceof Prisma.PrismaClientValidationError) {
					logger.error({ id, error: e }, 'error updating representation');
					throw new Error(`Error updating representation (${e.name})`);
				}
				throw e;
			}
		}
	};
}

/**
 * @param {Object<string, string>} params
 * @returns {{id: string, repId: string}}
 */
function validateParams(params) {
	const id = params.id;
	if (!id) {
		throw new Error('id param required');
	}
	const repId = params.repId;
	if (!repId) {
		throw new Error('repId param required');
	}
	return { id, repId };
}

/**
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {Object<string, *>} [viewData]
 */
export async function renderRepresentation(req, res, viewData = {}) {
	const reference = res.locals?.journeyResponse?.answers?.reference;
	const id = req.params.id;
	if (!id) {
		throw new Error('id param required');
	}

	await list(req, res, '', {
		reference,
		requiresReview: res.locals?.journeyResponse?.answers?.requiresReview,
		backLink: '.',
		repsLink: req.baseUrl + '/manage-representations',
		...viewData
	});
}

/**
 * Add a case updated flag to the session
 *
 * @param {{session?: Object<string, any>}} req
 * @param {string} id
 * @param {string} reviewDecision
 */
function addRepUpdatedSession(req, id, reviewDecision) {
	addSessionData(req, id, { repUpdated: reviewDecision });
}

/**
 * Read a case updated flag from the session
 *
 * @param {{session?: Object<string, any>}} req
 * @param {string} id
 * @returns {string|boolean}
 */
export function readRepUpdatedSession(req, id) {
	return readSessionData(req, id, 'repUpdated', false);
}

/**
 * Clear a case updated flag from the session
 *
 * @param {{session?: Object<string, any>}} req
 * @param {string} id
 */
export function clearRepUpdatedSession(req, id) {
	clearSessionData(req, id, 'repUpdated');
}

/**
 * Fetch the case details from the database to create the journey
 *
 * @param {Object} opts
 * @param {import('@prisma/client').PrismaClient} opts.db
 * @param {import('pino').BaseLogger} opts.logger
 * @returns {import('express').Handler}
 */
export function buildGetJourneyMiddleware({ db, logger }) {
	return async (req, res, next) => {
		const id = req.params.id;
		if (!id) {
			throw new Error('id param required');
		}
		const repId = req.params.repId;
		if (!repId) {
			throw new Error('repId param required');
		}
		logger.info({ id, repId }, 'view rep');

		const crownDevelopment = await db.crownDevelopment.findUnique({
			where: { id },
			select: { reference: true }
		});
		if (crownDevelopment === null) {
			return notFoundHandler(req, res);
		}

		const representation = await db.representation.findUnique({
			where: { reference: repId },
			include: {
				SubmittedFor: true,
				SubmittedByContact: true
			}
		});
		if (representation === null) {
			return notFoundHandler(req, res);
		}
		const answers = representationToViewModel(crownDevelopment.reference, representation);
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

function representationToViewModel(reference, representation) {
	return {
		reference,
		statusId: representation.statusId,
		repReference: representation.reference,
		submittedForId: representation.submittedForId,
		fullName: representation.SubmittedByContact?.fullName,
		email: representation.SubmittedByContact?.email,
		comment: representation.comment,
		commentRedacted: representation.commentRedacted,
		wantsToBeHeard: booleanToYesNoOrNull(representation.wantsToBeHeard),
		isAdult: booleanToYesNoOrNull(representation.isAdult),
		requiresReview: representation.statusId === REPRESENTATION_STATUS_ID.AWAITING_REVIEW
	};
}
