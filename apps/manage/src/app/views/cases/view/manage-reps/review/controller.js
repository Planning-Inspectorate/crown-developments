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
import { forwardStreamContents, getDriveItemDownloadUrl } from '@pins/crowndev-lib/documents/utils.js';
import { ALLOWED_MIME_TYPES } from '@pins/crowndev-lib/forms/representations/question-utils.js';
import { representationAttachmentsFolderPath } from '@pins/crowndev-lib/util/sharepoint-path.js';

/**
 * @typedef {import('express').Handler} Handler
 */

/**
 * @typedef {Object} ReviewControllers - controllers for review representation
 * @property {Handler} reviewRepresentationSubmission - handles POST for /review/task-list
 * @property {Handler} reviewRepresentation - handles POST for /review page and redirects users to /review/task-list page if there are no errors
 * @property {Handler} representationTaskList - handles GET for /review/task-list/comment
 * @property {Handler} reviewRepresentationComment - handles GET for /review/task-list/comment
 * @property {Handler} reviewRepresentationCommentDecision - handles POST for /review/task-list/comment
 * @property {Handler} redactRepresentation - handles GET for /review/task-list/comment/redact
 * @property {Handler} redactRepresentationPost - handles POST for /review/task-list/comment/redact
 * @property {Handler} redactConfirmation - handles GET for /review/task-list/comment/redact/confirmation
 * @property {Handler} acceptRedactedComment - handles POST for /review/task-list/comment/redact/confirmation
 * @property {Handler} reviewRepresentationDocument - handles GET for /review/task-list/:itemId
 * @property {Handler} reviewDocumentDecision - handles POST for /review/task-list/:itemId
 * @property {Handler} redactRepresentationDocument - handles GET for /task-list/:itemId/redact
 * @property {Handler} redactRepresentationDocumentPost - handles POST for /task-list/:itemId/redact
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
export function buildReviewControllers({ db, logger, getSharePointDrive }) {
	/** @type {ReviewControllers} */
	const controllers = {
		async reviewRepresentationSubmission(req, res) {
			const { id, representationRef } = validateParams(req.params);
			const crownDevelopment = await db.crownDevelopment.findUnique({
				where: { id }
			});

			if (!crownDevelopment) {
				return notFoundHandler(req, res);
			}

			const caseReference = crownDevelopment.reference;

			const commentStatus = readRepCommentReviewStatusSession(req, representationRef);
			const reviewDecision = getReviewStatus(commentStatus);
			const sessionFiles = req.session?.files?.[representationRef];

			await updateRepresentationItemsReviewStatus(req, db, logger);

			if (sessionFiles) {
				const sharePointDrive = getSharePointDrive(req.session);

				const allUploadedFileIds = Object.values(sessionFiles)
					.flatMap((entry) => entry.uploadedFiles)
					.map((attachment) => attachment.itemId);

				const folderPath = representationAttachmentsFolderPath(caseReference, representationRef);

				try {
					const representationFolder = await sharePointDrive.getDriveItemByPath(folderPath);
					const representationFolderId = representationFolder.id;

					logger.info(
						{ id, representationRef, allUploadedFileIds, representationFolderId, folderPath },
						'Moving representation attachments'
					);
					await sharePointDrive.moveItemsToFolder(allUploadedFileIds, representationFolderId);
				} catch (error) {
					logger.error(
						{
							error,
							id,
							representationRef,
							allUploadedFileIds,
							folderPath
						},
						'Error moving representation attachments'
					);
					throw new Error(`Failed to move representation attachments: ${error.message}`);
				}
			}
			logger.info({ id, representationRef }, 'moved representation attachments');

			delete req.session?.reviewDecisions?.[representationRef];
			delete req.session?.files?.[representationRef];

			const statusName = getStatusDisplayName(reviewDecision);
			addRepReviewedSession(req, id, statusName);

			const baseUrl = getBaseUrl(req);
			const repRefUrlSegment = `/${representationRef}`;
			const redirectUrl = baseUrl.includes(repRefUrlSegment)
				? baseUrl.slice(0, baseUrl.indexOf(repRefUrlSegment))
				: baseUrl;
			res.redirect(redirectUrl);
		},
		async reviewRepresentation(req, res) {
			const { errors = {}, errorSummary = [] } = req.body;

			if (Object.keys(errors).length > 0) {
				await renderRepresentation(req, res, { errors, errorSummary });
				return;
			}

			res.redirect(getBaseUrl(req) + '/task-list');
		},
		async representationTaskList(req, res) {
			const { representationRef } = validateParams(req.params);
			const representation = await db.representation.findUnique({
				where: { reference: representationRef },
				include: { Attachments: true }
			});

			if (!req.session?.reviewDecisions?.[representationRef]) {
				initialiseRepresentationReviewSession(req, representationRef, representation);
			}

			const repItemsReviewStatus = readRepReviewStatusSession(req, representationRef);

			const commentStatusTag = getReviewTaskStatus(repItemsReviewStatus?.comment?.reviewDecision);
			const representationAttachments = representation?.Attachments || [];
			const documents = representationAttachments.map((attachment) => {
				return {
					title: {
						text: attachment.fileName
					},
					href:
						repItemsReviewStatus?.comment?.reviewDecision !== REPRESENTATION_STATUS_ID.REJECTED
							? `${req.originalUrl}/${attachment.itemId}`
							: '',
					status: {
						tag: getReviewTaskStatus(repItemsReviewStatus?.[attachment.itemId]?.reviewDecision)
					}
				};
			});

			const taskStatusList = [
				repItemsReviewStatus?.comment?.reviewDecision,
				...representationAttachments.map((attachment) => repItemsReviewStatus?.[attachment.itemId]?.reviewDecision)
			];

			return res.render('views/cases/view/manage-reps/review/task-list.njk', {
				reference: representationRef,
				commentStatusTag,
				isCommentRejected: representation?.commentStatus === REPRESENTATION_STATUS_ID.REJECTED,
				documents: representation?.containsAttachments === true ? documents : [],
				reviewComplete: isReviewComplete(taskStatusList),
				journeyTitle: 'Manage Reps',
				layoutTemplate: 'views/layouts/forms-question.njk',
				backLinkUrl: getTaskListBackLinkUrl(req)
			});
		},
		async reviewRepresentationComment(req, res, viewData = {}) {
			const { representationRef } = validateParams(req.params);
			const representation = await db.representation.findUnique({
				where: { reference: representationRef },
				select: { comment: true }
			});

			if (representation === null) {
				return notFoundHandler(req, res);
			}

			return res.render('views/cases/view/manage-reps/review/review-comment.njk', {
				reference: representationRef,
				comment: representation.comment,
				commentStatus: readRepCommentReviewStatusSession(req, representationRef),
				accept: REPRESENTATION_STATUS_ID.ACCEPTED,
				acceptAndRedact: ACCEPT_AND_REDACT,
				reject: REPRESENTATION_STATUS_ID.REJECTED,
				journeyTitle: 'Manage Reps',
				layoutTemplate: 'views/layouts/forms-question.njk',
				backLinkUrl: getBaseUrl(req) + '/task-list',
				...viewData
			});
		},
		async reviewRepresentationCommentDecision(req, res) {
			const { representationRef } = validateParams(req.params);
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

			if (reviewCommentDecision !== ACCEPT_AND_REDACT) {
				const isRejected = reviewCommentDecision === REPRESENTATION_STATUS_ID.REJECTED;
				const commentStatusBeforeUpdate = readRepCommentReviewStatusSession(req, representationRef);
				const wasRejected = commentStatusBeforeUpdate === REPRESENTATION_STATUS_ID.REJECTED;

				if (isRejected || (wasRejected && !isRejected)) {
					updateDocumentStatusSession(req, logger, representationRef, isRejected);
				}
			}

			if (reviewCommentDecision === ACCEPT_AND_REDACT) {
				res.redirect(getBaseUrl(req) + '/task-list/comment/redact');
			} else {
				updateRepReviewSession(req, representationRef, 'comment', { reviewDecision: reviewCommentDecision });
				clearRepRedactedCommentSession(req, representationRef);
				res.redirect(getBaseUrl(req) + '/task-list');
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
				commentRedacted: readRepRedactedCommentSession(req, representationRef) || ''
			});
			const journey = new createRedactJourney(response, req);
			const section = journey.sections[0];
			const question = section.questions[0];
			const validationErrors = question.checkForValidationErrors(req, res, journey);
			if (validationErrors) {
				validationErrors.reference = representationRef;
				question.renderAction(res, validationErrors);
				return;
			}
			const viewModel = question.prepQuestionForRendering(section, journey);
			viewModel.reference = representationRef;
			question.renderAction(res, viewModel);
		},
		async redactRepresentationPost(req, res) {
			const { representationRef } = validateParams(req.params);
			const { comment } = req.body;
			updateRepReviewSession(req, representationRef, 'comment', { commentRedacted: comment });
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
			res.redirect(getBaseUrl(req) + '/task-list/comment/redact/confirmation');
		},
		async redactConfirmation(req, res) {
			const { representationRef } = validateParams(req.params);
			const commentRedacted = readRepRedactedCommentSession(req, representationRef);
			const answers = res.locals.journeyResponse.answers;
			const originalComment = answers.myselfComment || answers.submitterComment;

			return res.render('views/cases/view/manage-reps/review/redact-confirmation.njk', {
				originalComment,
				commentRedacted,
				reference: representationRef,
				journeyTitle: 'Manage Reps',
				layoutTemplate: 'views/layouts/forms-question.njk',
				backLinkUrl: getBaseUrl(req) + '/task-list/comment/redact'
			});
		},
		async acceptRedactedComment(req, res) {
			const { representationRef } = validateParams(req.params);

			const commentStatusBeforeUpdate = readRepCommentReviewStatusSession(req, representationRef);
			if (commentStatusBeforeUpdate === REPRESENTATION_STATUS_ID.REJECTED) {
				updateDocumentStatusSession(req, logger, representationRef, false);
			}

			updateRepReviewSession(req, representationRef, 'comment', { reviewDecision: ACCEPT_AND_REDACT });
			res.redirect(getBaseUrl(req) + '/task-list');
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
				documentStatus: readRepDocumentReviewStatusSession(req, representationRef, itemId),
				accept: REPRESENTATION_STATUS_ID.ACCEPTED,
				acceptAndRedact: ACCEPT_AND_REDACT,
				reject: REPRESENTATION_STATUS_ID.REJECTED,
				journeyTitle: 'Manage Reps',
				layoutTemplate: 'views/layouts/forms-question.njk',
				backLinkUrl: getBaseUrl(req) + '/task-list',
				currentUrl: getBaseUrl(req) + '/task-list/' + itemId,
				...viewData
			});
		},
		async reviewDocumentDecision(req, res) {
			const { id, representationRef } = validateParams(req.params);
			const itemId = req.params.itemId;
			if (!itemId) {
				throw new Error('itemId param required');
			}

			const { reviewDocumentDecision } = req.body;
			if (!reviewDocumentDecision) {
				req.body.errors = {
					reviewDocumentDecision: {
						msg: 'Select the review decision'
					}
				};
				req.body.errorSummary = expressValidationErrorsToGovUkErrorList(req.body.errors);
				await controllers.reviewRepresentationDocument(req, res, {
					errors: req.body.errors,
					errorSummary: req.body.errorSummary
				});
				return;
			}

			if (reviewDocumentDecision === ACCEPT_AND_REDACT) {
				res.redirect(getBaseUrl(req) + '/task-list/' + itemId + '/redact');
			} else {
				const [redactedFile] = getRedactedFile(req, representationRef, itemId);

				if (redactedFile) {
					safeDeleteUploadedFilesSession(req, representationRef, itemId);
					try {
						const sharePointDrive = getSharePointDrive(req.session);
						await sharePointDrive.deleteDocumentById(redactedFile.itemId);
					} catch (error) {
						logger.error(
							{ error, id, representationRef, itemId },
							`Error deleting file: ${itemId} from Sharepoint folder`
						);
						throw new Error('Failed to delete file');
					}
				}

				updateRepReviewSession(req, representationRef, itemId, { reviewDecision: reviewDocumentDecision });
				res.redirect(getBaseUrl(req) + '/task-list');
			}
		},
		async redactRepresentationDocument(req, res, viewData = {}) {
			const { representationRef } = validateParams(req.params);
			const itemId = req.params.itemId;
			if (!itemId) {
				throw new Error('itemId param required');
			}

			let { errors, errorSummary } = req.session || {};
			if (errors || errorSummary) {
				delete req.session.errors;
				delete req.session.errorSummary;
			}

			const document = await db.representationDocument.findFirst({
				where: { itemId: itemId },
				select: { fileName: true, redactedItemId: true, redactedFileName: true }
			});
			if (document === null) {
				return notFoundHandler(req, res);
			}

			const [redactedFile] = getRedactedFile(req, representationRef, itemId);

			return res.render('views/cases/view/manage-reps/review/redact-document.njk', {
				reference: representationRef,
				originalFileId: itemId,
				fileName: document?.fileName,
				redactedFileId: redactedFile?.itemId || document?.redactedItemId,
				redactedFileName: redactedFile?.fileName || document?.redactedFileName,
				allowedMimeTypes: ALLOWED_MIME_TYPES,
				journeyTitle: 'Manage Reps',
				layoutTemplate: 'views/layouts/forms-question.njk',
				backLinkUrl: getBaseUrl(req) + '/task-list/' + itemId,
				currentUrl: getBaseUrl(req) + '/task-list/' + itemId + '/redact',
				errors,
				errorSummary,
				...viewData
			});
		},
		async redactRepresentationDocumentPost(req, res) {
			const { representationRef } = validateParams(req.params);
			const itemId = req.params.itemId;
			if (!itemId) {
				throw new Error('itemId param required');
			}

			const [redactedFile] = getRedactedFile(req, representationRef, itemId);

			if (!redactedFile) {
				req.body.errors = {
					'upload-form': {
						msg: 'Upload an attachment'
					}
				};
				req.body.errorSummary = expressValidationErrorsToGovUkErrorList(req.body.errors);
				await controllers.redactRepresentationDocument(req, res, {
					errors: req.body.errors,
					errorSummary: req.body.errorSummary
				});
				return;
			}

			updateRepReviewSession(req, representationRef, itemId, { reviewDecision: ACCEPT_AND_REDACT });

			res.redirect(getBaseUrl(req) + '/task-list');
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
 * Render a document
 * @param {import('#service').ManageService} service
 * @param {global.fetch} [fetchImpl] - for testing
 * @returns {Handler}
 */
export function buildViewDocument(service, fetchImpl) {
	const { logger, getSharePointDrive } = service;
	return async (req, res) => {
		const sharePointDrive = getSharePointDrive(req.session);
		const itemId = req.params.itemId;
		if (!itemId) {
			throw new Error('itemId param required');
		}

		// to facilitate download of redacted file
		const documentId = req.params.documentId;
		const itemToDownloadId = documentId || itemId;

		const downloadUrl = await getDriveItemDownloadUrl(sharePointDrive, itemToDownloadId, logger);
		await forwardStreamContents(downloadUrl, req, res, logger, itemToDownloadId, fetchImpl);
	};
}

function getBaseUrl(req) {
	return req.baseUrl.endsWith('/review') ? req.baseUrl : `${req.baseUrl}/manage`;
}

function getTaskListBackLinkUrl(req) {
	return req.baseUrl.endsWith('/review') ? req.baseUrl : `${req.baseUrl}/edit`;
}

/**
 * Initialise session data for representation review
 *
 * @param {{session?: Object<string, any>}} req
 * @param {string} representationRef
 * @param {Object} representation
 */
function initialiseRepresentationReviewSession(req, representationRef, representation) {
	const existingReviewData = req.session?.reviewDecisions?.[representationRef] || {};
	const attachmentEntries = Object.fromEntries(
		representation?.Attachments.map(({ itemId, statusId, redactedItemId, redactedFileName }) => [
			itemId,
			getReviewDecision(statusId, redactedItemId && redactedFileName)
		])
	);
	const newReviewData = {
		...existingReviewData,
		comment: getReviewDecision(representation?.statusId, representation?.commentRedacted),
		...attachmentEntries
	};

	addSessionData(req, representationRef, newReviewData, 'reviewDecisions');
}

function getReviewDecision(statusId, isRedacted) {
	switch (statusId) {
		case REPRESENTATION_STATUS_ID.ACCEPTED:
			return {
				reviewDecision: isRedacted ? ACCEPT_AND_REDACT : REPRESENTATION_STATUS_ID.ACCEPTED
			};
		case REPRESENTATION_STATUS_ID.REJECTED:
			return { reviewDecision: REPRESENTATION_STATUS_ID.REJECTED };
		default:
			return { reviewDecision: '' };
	}
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
 * Add or update review decision data for a representation item in the session
 *
 * @param {{session?: Object<string, any>}} req
 * @param {string} representationRef
 * @param {string} itemId
 * @param {Object<string, any>} updates - Fields to merge into the item (e.g. { reviewDecision, commentRedacted })
 */
function updateRepReviewSession(req, representationRef, itemId, updates) {
	const currentItemData = req.session?.reviewDecisions?.[representationRef] || {};

	const newItemData = {
		...currentItemData,
		[itemId]: {
			...currentItemData[itemId],
			...updates
		}
	};

	addSessionData(req, representationRef, newItemData, 'reviewDecisions');
}

/**
 * Read review decision for comment for given representationRef
 *
 * @param {{session?: Object<string, any>}} req
 * @param {string} representationRef
 * @returns {string|undefined}
 */
function readRepCommentReviewStatusSession(req, representationRef) {
	return req.session?.reviewDecisions?.[representationRef]?.comment?.reviewDecision;
}

/**
 * Read redacted comment for given representationRef
 *
 * @param {{session?: Object<string, any>}} req
 * @param {string} representationRef
 * @returns {string|undefined}
 */
function readRepRedactedCommentSession(req, representationRef) {
	return req.session?.reviewDecisions?.[representationRef]?.comment?.commentRedacted;
}

/**
 * Read document item review decision for given representationRef
 *
 * @param {{session?: Object<string, any>}} req
 * @param {string} representationRef
 * @returns {string|undefined}
 */
function readRepDocumentReviewStatusSession(req, representationRef, itemId) {
	return req.session?.reviewDecisions?.[representationRef]?.[itemId]?.reviewDecision;
}

/**
 * Clear redacted comment from session for given representationRef
 *
 * @param {{session?: Object<string, any>}} req
 * @param {string} representationRef
 */
function clearRepRedactedCommentSession(req, representationRef) {
	delete req.session?.reviewDecisions?.[representationRef]?.comment?.commentRedacted;
}

/**
 * Read review status' for given representationRef
 *
 * @param {{session?: Object<string, any>}} req
 * @param {string} representationRef
 * @returns {object}
 */
function readRepReviewStatusSession(req, representationRef) {
	return req.session?.reviewDecisions?.[representationRef] || {};
}

/**
 * Generate govUk tag information based on review task status
 *
 * @param {string} status
 * @returns {{text: (string), classes: string}|{text: string, classes: string}}
 */
function getReviewTaskStatus(status) {
	switch (status) {
		case REPRESENTATION_STATUS_ID.ACCEPTED:
			return {
				text: 'Accepted',
				classes: 'govuk-tag--green status-tag-width'
			};
		case ACCEPT_AND_REDACT:
			return {
				text: 'Accepted and redacted',
				classes: 'govuk-tag--green status-tag-width'
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

function updateDocumentStatusSession(req, logger, representationRef, isRejected) {
	Object.entries(req.session?.reviewDecisions?.[representationRef])
		.filter(([key]) => key !== 'comment')
		.forEach(([, value]) => {
			value.reviewDecision = isRejected ? REPRESENTATION_STATUS_ID.REJECTED : REPRESENTATION_STATUS_ID.AWAITING_REVIEW;
		});
}

function getRedactedFile(req, representationRef, itemId) {
	const files = req.session?.files ?? {};
	return files?.[representationRef]?.[itemId]?.uploadedFiles || [];
}

async function updateRepresentationItemsReviewStatus(req, db, logger) {
	const { id, representationRef } = req.params;

	const decisions = req.session?.reviewDecisions?.[representationRef] || {};
	const files = req.session?.files?.[representationRef] || {};

	if (!Object.keys(decisions).length) return;

	//TODO: if rejected or doc status is no longer accept & redact then we need to clear the redacted item id and redacted filename from db
	//TODO: also clear redactedComment if the comment is no longer accept & redact
	try {
		await db.$transaction(async (tx) => {
			for (const [key, value] of Object.entries(decisions)) {
				if (key === 'comment') {
					/** @type {import('@prisma/client').Prisma.RepresentationUpdateInput} */
					const repUpdate = {
						statusId: getReviewStatus(value.reviewDecision),
						commentRedacted: readRepRedactedCommentSession(req, representationRef)
					};

					logger.info({ representationRef, repUpdate }, 'submit representation review');

					await tx.representation.update({
						where: { reference: representationRef },
						data: repUpdate
					});
					continue;
				}

				/** @type {import('@prisma/client').Prisma.RepresentationDocumentUpdateInput} */
				const repDocUpdate = {
					statusId: getReviewStatus(value.reviewDecision)
				};

				const [redactedFile] = files[key]?.uploadedFiles || [];
				if (redactedFile) {
					repDocUpdate.redactedItemId = redactedFile.itemId;
					repDocUpdate.redactedFileName = redactedFile.fileName;
				}

				const document = await tx.representationDocument.findFirst({
					where: { itemId: key },
					select: { id: true }
				});

				if (!document) {
					logger.warn({ id, representationRef, key }, 'Document not found for itemId');
					continue;
				}

				logger.info({ representationRef, itemId: document.id, repUpdate: repDocUpdate }, 'update document status');

				await tx.representationDocument.update({
					where: { id: document.id },
					data: repDocUpdate
				});
			}
		});
	} catch (error) {
		wrapPrismaError({
			error,
			logger,
			message: 'updating representation/document within transaction',
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

function getReviewStatus(reviewDecision) {
	return reviewDecision === ACCEPT_AND_REDACT ? REPRESENTATION_STATUS_ID.ACCEPTED : reviewDecision;
}

function safeDeleteUploadedFilesSession(req, representationRef, itemId) {
	const isSafeKey = (key) => typeof key === 'string' && !['__proto__', 'constructor', 'prototype'].includes(key);

	if (isSafeKey(representationRef) && isSafeKey(itemId)) {
		delete req.session?.files?.[representationRef]?.[itemId]?.uploadedFiles;
	} else {
		throw new Error('Invalid key provided to delete uploadedFiles from session data');
	}
}
