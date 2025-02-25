import { list } from '@pins/dynamic-forms/src/controller.js';
import { notFoundHandler } from '@pins/crowndev-lib/middleware/errors.js';
import { crownDevelopmentToViewModel, editsToDatabaseUpdates } from './view-model.js';
import { getQuestions } from './questions.js';
import { createJourney, JOURNEY_ID } from './journey.js';
import { JourneyResponse } from '@pins/dynamic-forms/src/journey/journey-response.js';
import { Prisma } from '@prisma/client';
import { isValidUuidFormat } from '@pins/crowndev-lib/util/uuid.js';
import { getEntraGroupMembers } from '#util/entra-groups.js';
import { dateIsBeforeToday, dateIsToday } from '@pins/dynamic-forms/src/lib/date-utils.js';
import { clearSessionData, readSessionData } from '@pins/crowndev-lib/util/session.js';
import { caseReferenceToFolderName } from '@pins/crowndev-lib/util/name.js';

/**
 *
 * @param {Object} opts
 * @param {function(session): SharePointDrive} opts.getSharePointDrive
 */
export function buildViewCaseDetails({ getSharePointDrive }) {
	return async (req, res) => {
		const reference = res.locals?.journeyResponse?.answers?.reference;
		const id = req.params.id;
		if (!id) {
			throw new Error('id param required');
		}
		// Show publish case validation errors
		const errors = readSessionData(req, id, 'publishedErrors', [], 'cases');
		if (errors.length > 0) {
			res.locals.errorSummary = errors;
		}
		clearSessionData(req, id, 'publishedErrors', 'cases');

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
 * @param {Object} opts
 * @param {import('@prisma/client').PrismaClient} db
 * @param {import('pino').BaseLogger} logger
 * @returns {import('@pins/dynamic-forms/src/controller.js').SaveDataFn}
 */
export function buildUpdateCase({ db, logger }) {
	return async ({ req, res, data }) => {
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

		const updateInput = editsToDatabaseUpdates(toSave, fullViewModel);
		updateInput.updatedDate = new Date();

		logger.info({ fields: Object.keys(toSave) }, 'update case input');

		try {
			await db.crownDevelopment.update({
				where: { id },
				data: updateInput
			});
		} catch (e) {
			// don't show Prisma errors to the user
			if (e instanceof Prisma.PrismaClientKnownRequestError) {
				logger.error({ id, error: e }, 'error updating case');
				throw new Error(`Error updating case (${e.code})`);
			}
			if (e instanceof Prisma.PrismaClientValidationError) {
				logger.error({ id, error: e }, 'error updating case');
				throw new Error(`Error updating case (${e.name})`);
			}
			throw e;
		}

		// show a banner to the user on success
		addCaseUpdatedSession(req, id);

		logger.info({ id }, 'case updated');
	};
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
 * @param {Object} opts
 * @param {import('@prisma/client').PrismaClient} opts.db
 * @param {import('pino').BaseLogger} opts.logger
 * @param {typeof import('../../../config-types.js').Config.entra.groupIds} opts.groupIds
 * @param {import('@pins/crowndev-lib/graph/types.js').InitEntraClient} opts.getEntraClient
 * @returns {import('express').Handler}
 */
export function buildGetJourneyMiddleware({ db, logger, groupIds, getEntraClient }) {
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
