import { list } from '@planning-inspectorate/dynamic-forms/src/controller.js';
import { notFoundHandler } from '@pins/crowndev-lib/middleware/errors.js';
import { crownDevelopmentToViewModel } from './view-model.js';
import { getQuestions } from './questions.js';
import { createJourney, JOURNEY_ID } from './journey.js';
import { JourneyResponse } from '@planning-inspectorate/dynamic-forms/src/journey/journey-response.js';
import { isValidUuidFormat } from '@pins/crowndev-lib/util/uuid.js';
import { getEntraGroupMembers } from '#util/entra-groups.js';
import { dateIsBeforeToday, dateIsToday } from '@planning-inspectorate/dynamic-forms/src/lib/date-utils.js';
import { clearSessionData, readSessionData } from '@pins/crowndev-lib/util/session.js';
import { caseReferenceToFolderName } from '@pins/crowndev-lib/util/sharepoint-path.js';
import { getLinkedCaseId, getLinkedCaseLinkText, hasLinkedCase } from '@pins/crowndev-lib/util/linked-case.js';

/**
 * @param {import('#service').ManageService} service
 */
export function buildViewCaseDetails({ db, getSharePointDrive, isApplicationUpdatesLive }) {
	return async (req, res) => {
		const reference = res.locals?.journeyResponse?.answers?.reference;
		const id = req.params.id;
		if (!id) {
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

		const publishDate = res.locals?.journeyResponse?.answers?.publishDate;
		const casePublished = publishDate && (dateIsToday(publishDate) || dateIsBeforeToday(publishDate));
		const baseUrl = req.baseUrl;

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
			baseUrl,
			sharePointLink,
			hideButton: true,
			hideStatus: true,
			isApplicationUpdatesLive,
			hasLinkedCase: hasLinkedCase(crownDevelopment),
			linkedCaseLink: await getLinkedCaseLink(db, crownDevelopment)
		});
	};
}

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
function readCaseUpdatedSession(req, id) {
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
function clearCaseUpdatedSession(req, id) {
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
 * @returns {import('express').Handler}
 */
export function buildGetJourneyMiddleware(service) {
	const { db, logger, getEntraClient } = service;
	const groupIds = service.entraGroupIds;
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
		const groupMembers = await getEntraGroupMembers({
			logger,
			initClient: getEntraClient,
			session: req.session,
			groupIds
		});
		const questions = getQuestions(groupMembers);
		// put these on locals for the list controller
		res.locals.originalAnswers = { ...answers };
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
