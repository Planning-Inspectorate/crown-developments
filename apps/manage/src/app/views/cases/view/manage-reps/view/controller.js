import { list } from '@planning-inspectorate/dynamic-forms/src/controller.js';
import { notFoundHandler } from '@pins/crowndev-lib/middleware/errors.ts';
import { getQuestions } from '@pins/crowndev-lib/forms/representations/questions.js';
import { createJourney, JOURNEY_ID } from './journey.js';
import { JourneyResponse } from '@planning-inspectorate/dynamic-forms/src/journey/journey-response.js';
import { representationToManageViewModel } from '@pins/crowndev-lib/forms/representations/view-model.js';
import { clearRepUpdatedSession, readRepUpdatedSession } from '../edit/controller.js';
import { clearSessionData, readSessionData } from '@pins/crowndev-lib/util/session.ts';
import {
	REPRESENTATION_STATUS_ID,
	REPRESENTATION_SUBMITTED_FOR_ID,
	RECEIVED_METHOD_ID
} from '@pins/crowndev-database/src/seed/data-static.ts';
import { getSubmittedForId } from '@pins/crowndev-lib/util/questions.ts';
import { BOOLEAN_OPTIONS } from '@planning-inspectorate/dynamic-forms/src/components/boolean/question.js';
import { BannerBuilder } from '@pins/crowndev-lib/views/banner/banner-builder.ts';
import { isSafeRelativeUrl, escapeHtml } from '@pins/crowndev-lib/util/string.ts';

/**
 * @typedef {import('@pins/crowndev-lib/views/banner/banner-builder').BannerMessage} BannerMessage
 * @typedef {{representationUpdated: boolean}} GetBannerMessagesOptions
 */

/**
 * Get all banner messages to display.
 *
 * @param {import('express').Response} res
 * @param {import('express').Request} req
 * @param {GetBannerMessagesOptions} options
 * @return {BannerMessage|null}
 */
function getBannerMessages(res, req, options) {
	const bannerBuilder = new BannerBuilder();

	if (options.representationUpdated) {
		bannerBuilder.addSuccessText('Representation has been updated');
	}

	const documentInfoBanner = getDocumentInfoBanner(res, req.baseUrl);

	if (!documentInfoBanner) {
		return bannerBuilder.build();
	}

	if (documentInfoBanner.name === 'awaitingReview') {
		const safeHref = escapeHtml(isSafeRelativeUrl(documentInfoBanner.href) ? documentInfoBanner.href : '#');
		return bannerBuilder
			.addInfoTrustedSingleLineHtml(
				`There are attachments awaiting review.
			<a class="govuk-notification-banner__link" href="${safeHref}">Manage attachments</a>.`
			)
			.build();
	}

	if (documentInfoBanner.name === 'noAttachmentsAdded') {
		const safeHref = escapeHtml(isSafeRelativeUrl(documentInfoBanner.href) ? documentInfoBanner.href : '#');
		return bannerBuilder
			.addInfoTrustedSingleLineHtml(
				`There are no attachments added.
			<a class="govuk-notification-banner__link" href="${safeHref}">Add attachments</a>.`
			)
			.build();
	}

	return bannerBuilder.build();
}

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
	const id = req.params.id;
	if (!id || typeof id !== 'string') {
		throw new Error('id param is required');
	}

	const { representationRef } = validateParams(req.params);

	// Show publish case validation errors
	const errors = readSessionData(req, representationRef, 'errors', [], 'representations');
	if (errors.length > 0) {
		res.locals.errorSummary = errors;
	}
	clearSessionData(req, representationRef, 'errors', 'representations');

	const representationUpdated = readRepUpdatedSession(req, representationRef);
	clearRepUpdatedSession(req, representationRef);

	const banner = getBannerMessages(res, req, { representationUpdated });

	await list(req, res, '', {
		representationRef,
		requiresReview: res.locals?.journeyResponse?.answers?.requiresReview,
		backLinkUrl: `/cases/${id}/manage-representations`,
		currentUrl: req.originalUrl,
		representationStatus: res.locals?.journeyResponse?.answers?.statusId,
		banner,
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
				Attachments: true,
				WithdrawalRequests: true
			}
		});
		// Prisma will return null if not found
		if (!representation) {
			return notFoundHandler(req, res);
		}
		const answers = representationToManageViewModel(representation, crownDevelopment.reference);
		const questions = getQuestions({
			methodOverrides: {
				initialValues: {
					submittedReceivedMethodId: answers?.submittedReceivedMethodId
				}
			},
			textOverrides: {
				notStartedText: '-',
				continueButtonText: 'Save',
				changeActionText: 'Edit',
				answerActionText: 'Edit'
			},
			actionOverrides: {
				statusShouldShowManageAction: answers?.statusId !== REPRESENTATION_STATUS_ID.WITHDRAWN,
				redactedCommentShowManageAction: answers?.statusId === REPRESENTATION_STATUS_ID.ACCEPTED,
				canEditAttachmentsUploaded: answers?.statusId !== REPRESENTATION_STATUS_ID.REJECTED,
				distressingContentInRepresentationShowManageAction: answers?.statusId !== REPRESENTATION_STATUS_ID.REJECTED,
				taskListUrl: req.baseUrl + '/manage/task-list'
			},
			editActionOverrides: {
				submittedReceivedMethodShouldShowEditAction:
					answers?.submittedReceivedMethodId != null && answers?.submittedReceivedMethodId !== RECEIVED_METHOD_ID.ONLINE
			}
		});
		// put these on locals for the list controller
		res.locals.originalAnswers = { ...answers };
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

function getDocumentInfoBanner(res, currentUrl) {
	const journey = res.locals.journey;
	const answers = journey.response?.answers || {};

	const submittedForId = getSubmittedForId(answers);
	const prefix = submittedForId === REPRESENTATION_SUBMITTED_FOR_ID.MYSELF ? 'myself' : 'submitter';
	const status = answers['statusId'];
	const containsAttachments = answers[`${prefix}ContainsAttachments`];
	const attachments = answers[`${prefix}Attachments`] || [];
	const someAttachmentsAwaitingReview = attachments?.some(
		(attachment) => attachment.statusId === REPRESENTATION_STATUS_ID.AWAITING_REVIEW
	);
	const trimmedUrl = currentUrl?.replace(/\/review$/, '');

	if (containsAttachments === BOOLEAN_OPTIONS.YES && attachments.length === 0) {
		const urlSection = submittedForId === REPRESENTATION_SUBMITTED_FOR_ID.MYSELF ? 'myself' : 'agent';
		return {
			name: 'noAttachmentsAdded',
			href: `${trimmedUrl}/edit/${urlSection}/attachments`
		};
	}

	const shouldShowAwaitingReviewBanner =
		status !== REPRESENTATION_STATUS_ID.AWAITING_REVIEW &&
		containsAttachments === BOOLEAN_OPTIONS.YES &&
		someAttachmentsAwaitingReview;
	if (shouldShowAwaitingReviewBanner) {
		return {
			name: 'awaitingReview',
			href: `${trimmedUrl}/manage/task-list`
		};
	}

	return null;
}
