import { list } from '@pins/dynamic-forms/src/controller.js';
import { notFoundHandler } from '@pins/crowndev-lib/middleware/errors.js';
import { crownDevelopmentToViewModel, editsToDatabaseUpdates } from './view-model.js';
import { getQuestions } from './questions.js';
import { createJourney, JOURNEY_ID } from './journey.js';
import { JourneyResponse } from '@pins/dynamic-forms/src/journey/journey-response.js';
import { isValidUuidFormat } from '@pins/crowndev-lib/util/uuid.js';
import { getEntraGroupMembers } from '#util/entra-groups.js';
import { dateIsBeforeToday, dateIsToday, formatDateForDisplay } from '@pins/dynamic-forms/src/lib/date-utils.js';
import { clearSessionData, readSessionData } from '@pins/crowndev-lib/util/session.js';
import { wrapPrismaError } from '@pins/crowndev-lib/util/database.js';
import { caseReferenceToFolderName } from '@pins/crowndev-lib/util/sharepoint-path.js';
import { BOOLEAN_OPTIONS } from '@pins/dynamic-forms/src/components/boolean/question.js';
import { addressToViewModel } from '@pins/dynamic-forms/src/lib/address-utils.js';

/**
 * @param {import('#service').ManageService} service
 */
export function buildViewCaseDetails({ getSharePointDrive }) {
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

		await list(req, res, '', {
			reference,
			caseUpdated,
			casePublished,
			baseUrl,
			sharePointLink,
			hideButton: true,
			hideStatus: true
		});
	};
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
 * @param {import('#service').ManageService} service
 * @returns {import('@pins/dynamic-forms/src/controller.js').SaveDataFn}
 */
export function buildUpdateCase(service) {
	return async ({ req, res, data }) => {
		const { db, logger } = service;
		const { id } = req.params;
		if (!id) {
			throw new Error(`invalid update case request, id param required (id:${id})`);
		}
		logger.info({ id }, 'case update');
		/** @type {import('./types.js').CrownDevelopmentViewModel} */
		const toSave = data?.answers || {};
		if (Object.keys(toSave).length === 0) {
			logger.info({ id }, 'no case updates to apply');
			return;
		}
		/** @type {import('./types.js').CrownDevelopmentViewModel} */
		const fullViewModel = res.locals?.journeyResponse?.answers || {};

		await updateCaseActions(req, res, service, id, toSave, fullViewModel);

		const updateInput = editsToDatabaseUpdates(toSave, fullViewModel);
		updateInput.updatedDate = new Date();

		logger.info({ fields: Object.keys(toSave) }, 'update case input');

		try {
			await db.crownDevelopment.update({
				where: { id },
				data: updateInput
			});
		} catch (error) {
			wrapPrismaError({
				error,
				logger,
				message: 'updating case',
				logParams: { id }
			});
		}

		// show a banner to the user on success
		addCaseUpdatedSession(req, id);

		logger.info({ id }, 'case updated');
	};
}

async function updateCaseActions(req, res, service, id, toSave, fullViewModel) {
	if (toSave.lpaQuestionnaireReceivedDate && fullViewModel.lpaQuestionnaireReceivedEmailSent !== BOOLEAN_OPTIONS.YES) {
		await sendLpaAcknowledgeReceiptOfQuestionnaireNotification(service, id, toSave.lpaQuestionnaireReceivedDate);
		toSave['lpaQuestionnaireReceivedEmailSent'] = true;
	}

	if (toSave.applicationReceivedDate) {
		const requiredFields = [
			{ value: fullViewModel.siteAddressId, message: 'Enter the site address' },
			{ value: fullViewModel.siteNorthing && fullViewModel.siteEasting, message: 'Enter the site coordinates' },
			{ value: fullViewModel.hasApplicationFee, message: 'Enter the fee amount' }
		];

		const errors = requiredFields
			.filter(({ value }) => !value)
			.map(({ message }) => ({
				text: message,
				href: '#'
			}));

		if (errors.length > 0) {
			const error = new Error('Data required to set Application received date is missing');
			error.errorSummary = errors;
			throw error;
		}
		//TODO: if no errors, then dispatch notification
	}
}

/**
 * @param {import('#service').ManageService} service
 * @param {string} id
 * @param {Date | string} lpaQuestionnaireReceivedDate
 */
async function sendLpaAcknowledgeReceiptOfQuestionnaireNotification(service, id, lpaQuestionnaireReceivedDate) {
	const { db, logger, notifyClient } = service;

	if (notifyClient === null) {
		logger.warn(
			'Gov Notify is not enabled, to use Gov Notify functionality setup Gov Notify environment variables. See README'
		);
	} else {
		const crownDevelopment = await db.crownDevelopment.findUnique({
			where: { id },
			include: { SiteAddress: true, Lpa: true }
		});

		const crownDevelopmentFields = crownDevelopmentToViewModel(crownDevelopment, service.contactEmail);

		try {
			await notifyClient.sendLpaAcknowledgeReceiptOfQuestionnaire(crownDevelopmentFields.lpaEmail, {
				reference: crownDevelopmentFields.reference,
				applicationDescription: crownDevelopmentFields.description,
				siteAddress: formatSiteLocation(crownDevelopment),
				lpaQuestionnaireReceivedDate: formatDateForDisplay(lpaQuestionnaireReceivedDate),
				frontOfficeLink: `${service.portalBaseUrl}/applications`
			});
		} catch (error) {
			logger.error(
				{ error, reference: crownDevelopmentFields.reference },
				`error dispatching LPA - Acknowledge Receipt of Questionnaire email notification`
			);
			throw new Error('Error encountered during email notification dispatch');
		}
	}
}

/**
 * Format site address depending on what is set on the case
 * @param {import('@priam/client').CrownDevelopment} crownDevelopment
 */
function formatSiteLocation(crownDevelopment) {
	if (crownDevelopment.siteAddressId) {
		return addressToViewModel(crownDevelopment.SiteAddress);
	} else if (crownDevelopment.siteNorthing || crownDevelopment.siteEasting) {
		return [
			`Northing: ${crownDevelopment.siteNorthing || '-'}`,
			`Easting: ${crownDevelopment.siteEasting || '-'}`
		].join(' , ');
	} else {
		return 'Site location not provided';
	}
}

/**
 * Add a case updated flag to the session
 *
 * @param {{session?: Object<string, any>}} req
 * @param {string} id
 */
function addCaseUpdatedSession(req, id) {
	if (!req.session) {
		throw new Error('request session required');
	}
	const cases = req.session.cases || (req.session.cases = {});
	const caseProps = cases[id] || (cases[id] = {});
	caseProps.updated = true;
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
