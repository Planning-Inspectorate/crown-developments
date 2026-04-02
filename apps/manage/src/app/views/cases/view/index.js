import { Router as createRouter } from 'express';
import { asyncHandler } from '@pins/crowndev-lib/util/async-handler.js';
import { buildSave, question } from '@planning-inspectorate/dynamic-forms/src/controller.js';
import validate from '@planning-inspectorate/dynamic-forms/src/validator/validator.js';
import { validationErrorHandler } from '@planning-inspectorate/dynamic-forms/src/validator/validation-error-handler.js';
import { buildGetJourneyMiddleware, buildViewCaseDetails, validateIdFormat } from './controller.js';
import { createRoutes as createCasePublishRoutes } from './publish/index.js';
import { createRoutes as createCaseUnpublishRoutes } from './unpublish/index.js';
import { createRoutes as createRepsRoutes } from './manage-reps/index.js';
import { createRoutes as createApplicationUpdatesRoutes } from './application-updates/index.js';
import { buildUpdateCase } from './update-case.js';
import {
	buildGetJourneyResponseFromSession,
	saveDataToSession
} from '@planning-inspectorate/dynamic-forms/src/lib/session-answer-store.js';
import { JOURNEY_ID } from './journey.js';

const questionConfig = {
	'check-agent-contact-details': {
		fieldName: 'manageAgentContactDetails',
		successMessage: 'Contact removed'
	},
	'check-applicant-contact-details': {
		fieldName: 'manageApplicantContactDetails',
		successMessage: 'Contact removed'
	},
	'check-applicant-details': {
		fieldName: 'manageApplicantDetails',
		successMessage: 'Organisation removed'
	}
};

/**
 * @param {string} questionUrl
 * @returns {string}
 */
const buildSuccessBannerMessageKey = (questionUrl) => `${questionUrl}:item-removed-success`;

/**
 * Mark a banner message as present for a given question URL.
 *
 * @param {import('express').Request} req
 * @param {string} questionUrl
 */
const setBannerMessage = (req, questionUrl) => {
	if (!req?.session) return;
	req.session.bannerMessage = req.session.bannerMessage || {};
	req.session.bannerMessage[buildSuccessBannerMessageKey(questionUrl)] = true;
};

/**
 * Delete DB-backed manage-list items immediately when remove is confirmed.
 *
 * dynamic-forms stores answers in session and (for manage-lists) will remove the item
 * from the session array. However, for the view journey we re-hydrate answers from the DB
 * on each request, so we also need to delete the item from the DB at confirm time.
 *
 * This middleware runs ahead of the normal dynamic-forms save-to-session handler.
 *
 * @param {import('#service').ManageService} service
 * @returns {import('express').Handler}
 */
export function buildDeleteManageListItemOnConfirmRemove(service) {
	const { db, logger } = service;
	/**
	 * dynamic-forms routes use the question URL segment (Question#url) not the Question#fieldName.
	 * For delete handling we key off fieldName, so we need a small mapping.
	 *
	 * @type {Record<string, string>}
	 */
	const questionUrlToFieldName = Object.fromEntries(
		Object.entries(questionConfig).map(([questionUrl, cfg]) => [questionUrl, cfg.fieldName])
	);

	/**
	 * @typedef DeleteHandlerArgs
	 * @property {import('express').Request} req
	 * @property {string} id
	 * @property {string} manageListItemId
	 */
	/** @type {Record<string, (args: DeleteHandlerArgs) => Promise<void>>} */
	const deleteHandlersByFieldName = {
		// Applicants: session item id is Organisation.id; remove relationship record for this case
		manageApplicantDetails: async ({ req, id, manageListItemId }) => {
			await db.crownDevelopmentToOrganisation.deleteMany({
				where: { crownDevelopmentId: id, organisationId: manageListItemId }
			});
			try {
				await db.organisation.delete({ where: { id: manageListItemId } });
				setBannerMessage(req, 'check-applicant-details');
			} catch (error) {
				logger?.warn?.(
					{ id, manageListItemId, err: error },
					'Unable to delete Organisation record (may still be referenced)'
				);
			}
		},
		// Applicant contacts: session item id is Contact.id; remove join rows across the organisations for this case
		manageApplicantContactDetails: async ({ req, id, manageListItemId }) => {
			// 1) remove join rows for this case
			await db.organisationToContact.deleteMany({
				where: {
					contactId: manageListItemId,
					Organisation: {
						CrownDevelopmentToOrganisation: {
							some: { crownDevelopmentId: id }
						}
					}
				}
			});
			// 2) remove the contact row (may fail if the contact is still referenced elsewhere)
			try {
				await db.contact.delete({ where: { id: manageListItemId } });
				setBannerMessage(req, 'check-applicant-contact-details');
			} catch (error) {
				logger?.warn?.(
					{ id, manageListItemId, err: error },
					'Unable to delete Contact record (may still be referenced)'
				);
			}
		},
		// Agent contacts: session item id is Contact.id; remove join rows for the agent organisation on this case
		manageAgentContactDetails: async ({ req, id, manageListItemId }) => {
			await db.organisationToContact.deleteMany({
				where: {
					contactId: manageListItemId,
					Organisation: {
						CrownDevelopmentToOrganisation: {
							some: { crownDevelopmentId: id }
						}
					}
				}
			});
			// 2) remove the contact row (may fail if the contact is still referenced elsewhere)
			try {
				await db.contact.delete({ where: { id: manageListItemId } });
				// success banner for next GET of the parent question page
				setBannerMessage(req, 'check-agent-contact-details');
			} catch (error) {
				logger?.warn?.(
					{ id, manageListItemId, err: error },
					'Unable to delete Contact record (may still be referenced)'
				);
			}
		}
	};

	return async (req, res, next) => {
		try {
			const { manageListAction, manageListItemId, manageListQuestion, question, id } = req.params;
			if (
				typeof manageListAction !== 'string' ||
				typeof manageListItemId !== 'string' ||
				typeof manageListQuestion !== 'string' ||
				typeof question !== 'string'
			) {
				return next();
			}
			// Only act on the remove-confirm step (manageListQuestion is the step url, e.g. "confirm")
			if (manageListAction !== 'remove' || manageListQuestion !== 'confirm' || !manageListItemId) {
				return next();
			}
			if (!id || typeof id !== 'string') {
				return next();
			}
			const fieldName = questionUrlToFieldName[question] || question;
			// The DB-backed list is identified by the parent question (mapped to fieldName)
			const deleteHandler = deleteHandlersByFieldName[fieldName];
			if (!deleteHandler) {
				logger?.warn?.(
					{ id, manageListAction, manageListItemId, manageListQuestion, fieldName },
					'No manage-list delete handler configured'
				);
				return next();
			}

			logger?.info?.({ id, manageListQuestion, manageListItemId, fieldName }, 'Deleting manage-list item from DB');
			await deleteHandler({ req, id, manageListItemId });

			return next();
		} catch (error) {
			return next(error);
		}
	};
}

/**
 * @param {import('#service').ManageService} service
 * @returns {import('express').Router}
 */
export function createRoutes(service) {
	const router = createRouter({ mergeParams: true });
	const repsRoutes = createRepsRoutes(service);
	const getQuestionJourney = asyncHandler(buildGetJourneyMiddleware(service, true));
	const getViewJourney = asyncHandler(buildGetJourneyMiddleware(service, false));
	const viewCaseDetails = buildViewCaseDetails(service);
	const updateCaseFn = buildUpdateCase(service);
	const clearAndUpdateCaseFn = buildUpdateCase(service, true);
	const clearAndUpdateCase = buildSave(clearAndUpdateCaseFn, true);
	const updateCase = buildSave(updateCaseFn, true);
	const publishCase = createCasePublishRoutes(service);
	const unpublishCase = createCaseUnpublishRoutes(service);
	const applicationUpdates = createApplicationUpdatesRoutes(service);
	const getJourneyResponse = buildGetJourneyResponseFromSession(JOURNEY_ID);
	const questionsWithDeleteSuccessBanner = new Set(Object.keys(questionConfig));
	const deleteManageListItemOnConfirmRemove = asyncHandler(buildDeleteManageListItemOnConfirmRemove(service));
	/**
	 * Map question URL to success message
	 * @type {Record<string, string>}
	 */
	const questionUrlToSuccessMessage = Object.fromEntries(
		Object.entries(questionConfig).map(([questionUrl, cfg]) => [questionUrl, cfg.successMessage])
	);

	/**
	 * Middleware to add a success banner after confirming deletion of a manage-list item, where the deletion was successful.
	 *
	 * @param {import('express').Request} req
	 * @param {import('express').Response} res
	 * @param {import('express').NextFunction} next
	 * @returns {void}
	 */
	const addSuccessBannerFromMessage = (req, res, next) => {
		try {
			const { question } = req.params;
			if (!question || typeof question !== 'string') return next();
			if (!questionsWithDeleteSuccessBanner.has(question)) return next();
			if (!req?.session) return next();
			const bannerMessageKey = buildSuccessBannerMessageKey(question);
			if (req.session.bannerMessage?.[bannerMessageKey]) {
				res.locals.notificationBannerSuccess = questionUrlToSuccessMessage[question] || 'Item removed';
				delete req.session.bannerMessage[bannerMessageKey];
			}
			return next();
		} catch (e) {
			return next(e);
		}
	};

	// view case details
	router.get('/', validateIdFormat, getViewJourney, asyncHandler(viewCaseDetails));
	router.use('/publish', publishCase);
	router.use('/unpublish', unpublishCase);

	router.use('/manage-representations', repsRoutes);

	if (service.isApplicationUpdatesLive) {
		router.use('/application-updates', applicationUpdates);
	}

	// view question page
	router.get(
		'/:section/:question{/:manageListAction/:manageListItemId/:manageListQuestion}',
		validateIdFormat,
		getJourneyResponse,
		getQuestionJourney,
		addSuccessBannerFromMessage,
		asyncHandler(question)
	);

	// submit edit
	router.post(
		'/:section/:question',
		validateIdFormat,
		getJourneyResponse,
		getQuestionJourney,
		validate,
		validationErrorHandler,
		asyncHandler(updateCase)
	);

	router.post(
		'/:section/:question{/:manageListAction/:manageListItemId/:manageListQuestion}',
		getJourneyResponse,
		getQuestionJourney,
		validate,
		validationErrorHandler,
		deleteManageListItemOnConfirmRemove,
		buildSave(saveDataToSession)
	);

	router.post('/:section/:question/remove', validateIdFormat, getQuestionJourney, asyncHandler(clearAndUpdateCase));

	return router;
}
