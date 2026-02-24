import { list } from '@planning-inspectorate/dynamic-forms/src/controller.js';
import { notFoundHandler } from '@pins/crowndev-lib/middleware/errors.js';
import { crownDevelopmentToViewModel } from './view-model.js';
import { getQuestions } from './questions.js';
import { createJourney, createJourneyV2, JOURNEY_ID } from './journey.js';
import { JourneyResponse } from '@planning-inspectorate/dynamic-forms/src/journey/journey-response.js';
import { isValidUuidFormat } from '@pins/crowndev-lib/util/uuid.js';
import { getEntraGroupMembers } from '#util/entra-groups.js';
import { dateIsBeforeToday, dateIsToday } from '@planning-inspectorate/dynamic-forms/src/lib/date-utils.js';
import { clearSessionData, readSessionData } from '@pins/crowndev-lib/util/session.js';
import { caseReferenceToFolderName } from '@pins/crowndev-lib/util/sharepoint-path.js';
import { getLinkedCaseId, getLinkedCaseLinkText, hasLinkedCase } from '@pins/crowndev-lib/util/linked-case.js';
import { APPLICATION_SUB_TYPE_ID, APPLICATION_TYPE_ID } from '@pins/crowndev-database/src/seed/data-static.js';
import { filteredStagesToRadioOptions } from './question-utils.js';
import { clearDataFromSession } from '@planning-inspectorate/dynamic-forms/src/lib/session-answer-store.js';
import { yesNoToBoolean } from '@planning-inspectorate/dynamic-forms/src/components/boolean/question.js';
import { getApplicantOrganisationOptions } from '../util/applicant-organisation-options.js';

/**
 * @typedef {import('./types').CrownDevelopmentViewModel} CrownDevelopmentViewModel
 * @typedef {import('@pins/crowndev-sharepoint/src/sharepoint/drives/drives.js').DriveItemByPathResponse} DriveItemByPathResponse
 * @typedef {import('@pins/crowndev-database').Prisma.CrownDevelopmentGetPayload<{
 *  	include: {
 *  		ParentCrownDevelopment: { select: { id: true } },
 *  		ChildrenCrownDevelopment: { select: { id: true } }
 *  	}
 * }>} CrownDevelopmentWithLinkedCase
 */

/**
 * @param {import('#service').ManageService} service
 * @returns {import('express').Handler}
 */
export function buildViewCaseDetails({ db, getSharePointDrive, isApplicationUpdatesLive }) {
	return async (req, res) => {
		const reference = res.locals?.journeyResponse?.answers?.reference;
		const id = req.params.id;
		if (!id || typeof id !== 'string') {
			throw new Error('id param required');
		}
		// Show publish case validation errors
		const errors = readSessionData(req, id, 'publishErrors', [], 'cases');
		if (errors.length > 0) {
			res.locals.errorSummary = errors;
		}
		clearSessionData(req, id, 'publishErrors', 'cases');

		// immediately clear this so the banner only shows once
		const caseUpdated = readCaseUpdatedSession(req, id);
		clearCaseUpdatedSession(req, id);
		clearAllSessionData(req, res, id);

		const publishDate = res.locals?.journeyResponse?.answers?.publishDate;
		const casePublished = publishDate && (dateIsToday(publishDate) || dateIsBeforeToday(publishDate));
		const baseUrl = req.baseUrl;
		const successParam = req.query.success;
		const casePublishSuccess = successParam === 'published' && casePublished;
		const caseUnpublishSuccess = successParam === 'unpublish' && !casePublished;
		const sharePointDrive = getSharePointDrive(req.session);
		let sharePointLink = '';
		if (sharePointDrive) {
			sharePointLink = await getSharePointFolderLink(sharePointDrive, caseReferenceToFolderName(reference));
		}

		const crownDevelopment = await db.crownDevelopment.findUnique({
			where: { id },
			include: {
				ParentCrownDevelopment: { select: { id: true } },
				ChildrenCrownDevelopment: { select: { id: true } }
			}
		});

		await list(req, res, '', {
			reference,
			caseUpdated,
			casePublished,
			casePublishSuccess,
			caseUnpublishSuccess,
			baseUrl,
			sharePointLink,
			hideButton: true,
			hideStatus: true,
			isApplicationUpdatesLive,
			hasLinkedCase: hasLinkedCase(crownDevelopment),
			linkedCaseLink: crownDevelopment ? await getLinkedCaseLink(db, crownDevelopment) : undefined
		});
	};
}

/**
 * Get the linked case link HTML
 * @param {import('#service').ManageService['db']} db
 * @param {CrownDevelopmentWithLinkedCase} crownDevelopment
 * @returns {Promise<string|undefined>}
 */
async function getLinkedCaseLink(db, crownDevelopment) {
	if (hasLinkedCase(crownDevelopment)) {
		return `<a href="/cases/${getLinkedCaseId(crownDevelopment)}" class="govuk-link govuk-link--no-visited-state">${await getLinkedCaseLinkText(db, crownDevelopment)} application</a>`;
	}
}

/**
 * Wrap the sharepoint call to catch SharePoint errors
 *
 * @param {import('@pins/crowndev-sharepoint/src/sharepoint/drives/drives.js').SharePointDrive} sharePointDrive
 * @param {string} path
 * @returns {Promise<DriveItemByPathResponse>}
 */
async function getSharePointFolderLink(sharePointDrive, path) {
	try {
		const item = await sharePointDrive.getDriveItemByPath(path, [['$select', 'webUrl']]);
		return item.webUrl;
	} catch {
		// just don't show the button, don't throw an error
	}
}

/**
 * @type {import('express').Handler}
 */
export function validateIdFormat(req, res, next) {
	const id = req.params.id;
	if (!id) {
		throw new Error('id param required');
	}
	if (!isValidUuidFormat(id)) {
		return notFoundHandler(req, res);
	}
	next();
}

/**
 * Read a case updated flag from the session
 *
 * @param {{session?: Object<string, any>}} req
 * @param {string} id
 * @returns {boolean}
 */
export function readCaseUpdatedSession(req, id) {
	if (!req.session) {
		return false;
	}
	const caseProps = (req.session?.cases && req.session.cases[id]) || {};
	return Boolean(caseProps.updated);
}

/**
 * Clear a case updated flag from the session
 *
 * @param {{session?: Object<string, any>}} req
 * @param {string} id
 */
export function clearCaseUpdatedSession(req, id) {
	if (!req.session) {
		return; // no need to error here
	}
	const caseProps = (req.session?.cases && req.session.cases[id]) || {};
	delete caseProps.updated;
}

/**
 * Fetch the case details from the database to create the journey
 *
 * @param {import('#service').ManageService} service
 * @param {boolean} isQuestionView - whether this journey is for a question page (true) or the case details page (false).
 * @returns {import('express').Handler}
 */
export function buildGetJourneyMiddleware(service, isQuestionView = false) {
	const { db, logger, getEntraClient } = service;
	const groupIds = service.entraGroupIds;
	/**
	 * @param {import('express').Request} req
	 * @param {import('express').Response} res
	 * @param {import('express').NextFunction} next
	 */
	return async (req, res, next) => {
		const { id, section, manageListQuestion } = req.params;
		if (!id || typeof id !== 'string') {
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
				SecondaryLpa: { include: { Address: true } },
				SiteAddress: true,
				ParentCrownDevelopment: { select: { reference: true } },
				ChildrenCrownDevelopment: { select: { reference: true } },
				Organisations: {
					include: {
						Organisation: {
							include: {
								Address: true,
								OrganisationToContact: {
									include: {
										Contact: { include: { Address: true } }
									}
								}
							}
						}
					}
				}
			}
		});
		if (crownDevelopment === null) {
			return notFoundHandler(req, res);
		}
		const answers = crownDevelopmentToViewModel(crownDevelopment);
		const groupMembers = await getEntraGroupMembers({
			logger,
			initClient: getEntraClient,
			session: req.session,
			groupIds
		});
		const overrides = {
			isApplicationTypePlanningOrLbc: answers.typeId === APPLICATION_TYPE_ID.PLANNING_AND_LISTED_BUILDING_CONSENT,
			isApplicationSubTypeLbc: answers.subTypeId === APPLICATION_SUB_TYPE_ID.LISTED_BUILDING_CONSENT,
			filteredStageOptions: filteredStagesToRadioOptions(answers.procedureId),
			applicantOrganisationOptions: getApplicantOrganisationOptions(answers.manageApplicantDetails || []),
			hasAgentAnswer: yesNoToBoolean(answers.hasAgent),
			isQuestionView: isQuestionView
		};

		const questions = getQuestions(groupMembers, overrides);

		const finalAnswers = combineSessionAndDbData(res, answers);

		// put these on locals for the list controller
		res.locals.originalAnswers = { ...answers };
		res.locals.journeyResponse = new JourneyResponse(JOURNEY_ID, 'ref', finalAnswers);
		res.locals.journey = service.isMultipleApplicantsLive
			? createJourneyV2(questions, res.locals.journeyResponse, req)
			: createJourney(questions, res.locals.journeyResponse, req);

		// set a back link to the case details page when viewing a section/question not within a manage list question
		// e.g. /cases/:id/:section/:question and not /cases/:id/:section/:question/:manageListAction/:manageListItemId/:manageListQuestion
		if (section && !manageListQuestion) {
			res.locals.backLinkUrl = req.baseUrl;
		}

		// set a back link to the case details page when on an edit page
		// e.g. /cases/:id/edit
		if (!res.locals.backLinkUrl) {
			const originalUrl = typeof req.originalUrl === 'string' ? req.originalUrl : '';
			if (/\/edit\/?$/.test(originalUrl)) {
				res.locals.backLinkUrl = req.baseUrl;
			}
		}

		next();
	};
}

/**
 * Combine session answers with DB answers
 *
 * Session answers take precedence unless they are undefined or null.
 * For array answers (e.g. manage list questions), the arrays are merged
 * such that items with matching IDs are merged together to preserve
 * any unchanged data from the DB.
 * @param {import('express').Response} res
 * @param {CrownDevelopmentViewModel} answers
 * @returns {CrownDevelopmentViewModel & import('@planning-inspectorate/dynamic-forms/src/journey/journey-types').JourneyAnswers}
 */
export function combineSessionAndDbData(res, answers) {
	const finalAnswers = { ...answers };
	const journeyResponseAnswers = res.locals.journeyResponse?.answers;
	if (!journeyResponseAnswers || Object.keys(journeyResponseAnswers).length === 0) return finalAnswers;

	const sessionAnswers = res.locals.journeyResponse.answers;

	Object.keys(sessionAnswers).forEach((key) => {
		const dbValue = answers[key];
		const sessionValue = sessionAnswers[key];

		// prefer session value unless it's undefined or null
		if (sessionValue !== undefined && sessionValue !== null) {
			if (Array.isArray(dbValue) && Array.isArray(sessionValue)) {
				// merge arrays (for manage list questions)
				finalAnswers[key] = mergeArraysById(dbValue, sessionValue);
			} else {
				finalAnswers[key] = sessionValue;
			}
		} else {
			finalAnswers[key] = dbValue;
		}
	});
	// Type assertion: result is a superset of both types
	/** @type {CrownDevelopmentViewModel & import('@planning-inspectorate/dynamic-forms/src/journey/journey-types').JourneyAnswers} */
	return finalAnswers;
}

/**
 * Helper to merge two arrays of objects
 *
 * If a session item has an ID that matches a DB item, it is merged with it to overwrite the different keys.
 * If no match is found, it is appended as a new item.
 * @param {Array<Record<string, any>>} dbArray
 * @param {Array<Record<string, any>>} sessionArray
 * @param {string} [idKey='id']
 * @returns {Array<Record<string, any>>}
 *
 */
export function mergeArraysById(dbArray, sessionArray, idKey = 'id') {
	const merged = [...dbArray];

	sessionArray.forEach((sessionItem) => {
		const existingIndex = merged.findIndex(
			(dbItem) => dbItem[idKey] && sessionItem[idKey] && dbItem[idKey] === sessionItem[idKey]
		);

		if (existingIndex !== -1) {
			// If not found (-1) spread the two items together such that the new session data overwrites the key
			merged[existingIndex] = { ...merged[existingIndex], ...sessionItem };
		} else {
			merged.push(sessionItem);
		}
	});

	return merged;
}

/**
 * Clears the session data for the Journey as well
 * as for any specifically added session data like
 * error flags.
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {string} id
 */
function clearAllSessionData(req, res, id) {
	// We clear the journey session to avoid ghost data from partially saved answers
	clearDataFromSession({ req, journeyId: JOURNEY_ID });

	// Clear updated flag if present so that we only see it once.
	clearSessionData(req, id, 'updated');

	const errors = readSessionData(req, id, 'updateErrors', [], 'cases');
	if (!(typeof errors === 'boolean') && errors.length > 0) {
		if (!res.locals.errorSummary) res.locals.errorSummary = [];
		res.locals.errorSummary.push(errors);
	}
	clearSessionData(req, id, 'updateErrors', 'cases');
}
