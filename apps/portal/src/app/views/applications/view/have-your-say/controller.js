import { isValidUuidFormat } from '@pins/crowndev-lib/util/uuid.js';
import { notFoundHandler } from '@pins/crowndev-lib/middleware/errors.js';
import { applicationLinks, crownDevelopmentToViewModel } from '../view-model.js';
import { fetchPublishedApplication } from '#util/applications.js';
import { nowIsWithinRange } from '@planning-inspectorate/dynamic-forms/src/lib/date-utils.js';
import { clearSessionData, readSessionData } from '@pins/crowndev-lib/util/session.js';
import { shouldDisplayApplicationUpdatesLink } from '../../../util/application-util.js';
import { buildRequiredCheckboxGroup } from '@pins/crowndev-lib/forms/custom-components/checkbox-validation/checkbox-validation.js';

const declarationItems = [
	{
		value: 'consent',
		text: 'I consent to my name, comment and supporting documents being published on this website',
		errorMessage: 'Select that you agree to publish your name, comment and supporting documents'
	},
	{
		value: 'connect',
		text: 'The Planning Inspectorate may contact me by email about my comment and supporting documents',
		errorMessage: 'Select that you agree to be contacted by email about your comment and documents'
	},
	{
		value: 'read',
		html: "I have read and understood the <a href='https://www.gov.uk/government/publications/planning-inspectorate-privacy-notices/customer-privacy-notice'>Customer Privacy Notice</a>",
		errorMessage: 'Select that you have read and understood the Customer Privacy Notice'
	}
];

function renderDeclaration(res, applicationId, items, errorSummary = undefined) {
	return res.render('views/applications/view/have-your-say/declaration.njk', {
		pageTitle: 'Declaration',
		id: applicationId,
		backLinkUrl: 'check-your-answers',
		declarationItems: items,
		errorSummary,
		errors: errorSummary,
		...(res.req?.app?.locals?.config ? { config: res.req.app.locals.config } : {})
	});
}

/**
 * @param {import('#service').PortalService} service
 * @returns {import('express').Handler}
 */
export function buildHaveYourSayPage(service) {
	const { db } = service;
	return async (req, res) => {
		const id = req.params.applicationId;
		if (!id) {
			throw new Error('id param required');
		}
		if (!isValidUuidFormat(id)) {
			return notFoundHandler(req, res);
		}

		const crownDevelopment = await fetchPublishedApplication({
			id,
			db,
			args: {}
		});

		if (!crownDevelopment) {
			return notFoundHandler(req, res);
		}

		const crownDevelopmentFields = crownDevelopmentToViewModel(crownDevelopment, service.contactEmail);
		const haveYourSayPeriod = {
			start: new Date(crownDevelopment.representationsPeriodStartDate),
			end: new Date(crownDevelopment.representationsPeriodEndDate)
		};
		const representationsPublishDate = crownDevelopment.representationsPublishDate;
		const displayApplicationUpdates = await shouldDisplayApplicationUpdatesLink(db, id);

		res.render('views/applications/view/have-your-say/view.njk', {
			pageCaption: crownDevelopmentFields.reference,
			pageTitle: 'Have your say on a Crown Development Application',
			links: applicationLinks(id, haveYourSayPeriod, representationsPublishDate, displayApplicationUpdates),
			currentUrl: req.originalUrl,
			crownDevelopmentFields
		});
	};
}

export function startHaveYourSayJourney(service) {
	const { logger } = service;
	return async (req, res) => {
		logger.info('Redirecting to Have Your Say Journey');
		res.redirect(req.baseUrl + '/start/who-submitting-for');
	};
}

/**
 *
 * @param { import('@prisma/client').PrismaClient } db
 * @returns {import('express').Handler}
 */
export function getIsRepresentationWindowOpen(db) {
	return async function (req, res, next) {
		const id = req.params.applicationId;
		if (!id) {
			throw new Error('id param required');
		}

		const crownDevelopment = await fetchPublishedApplication({
			id,
			db,
			args: {
				select: {
					representationsPeriodStartDate: true,
					representationsPeriodEndDate: true
				}
			}
		});

		if (
			!crownDevelopment ||
			!crownDevelopment.representationsPeriodStartDate ||
			!crownDevelopment.representationsPeriodEndDate
		) {
			return notFoundHandler(req, res);
		}

		const representationsPeriodStartDate = new Date(crownDevelopment.representationsPeriodStartDate);
		const representationsPeriodEndDate = new Date(crownDevelopment.representationsPeriodEndDate);

		if (!nowIsWithinRange(representationsPeriodStartDate, representationsPeriodEndDate)) {
			return notFoundHandler(req, res);
		}
		next();
	};
}

/**
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {viewHaveYourSayDeclarationPage} next
 * @returns {import('express').Handler}
 */
export async function viewHaveYourSayDeclarationPage(req, res, next) {
	const id = req.params?.applicationId;
	if (!id) {
		throw new Error('id param required');
	}
	if (!isValidUuidFormat(id)) {
		return notFoundHandler(req, res);
	}
	if (req.method === 'POST') {
		const groupRequiredCheckbox = buildRequiredCheckboxGroup(req.body?.declaration, declarationItems, {
			idPrefix: 'declaration'
		});

		if (!groupRequiredCheckbox.valid) {
			res.locals = res.locals || {};
			res.locals.errorSummary = groupRequiredCheckbox.errorSummary;
			return renderDeclaration(res, id, groupRequiredCheckbox.items, groupRequiredCheckbox.errorSummary);
		}

		return next();
	}

	const items = declarationItems.map((item) => ({ ...item }));
	return res.render('views/applications/view/have-your-say/declaration.njk', {
		pageTitle: 'Declaration',
		id: id,
		declarationItems: items,
		backlinkUrl: `check-your-answers`,
		errorMessage: undefined
	});
}

export const addRepresentationErrors = (req, res, next) => {
	const id = req.params.applicationId || req.params.id;
	const errors = readSessionData(req, id, 'representationError', [], 'cases');
	if (errors.length > 0) {
		res.locals = res.locals || {};
		res.locals.errorSummary = errors;
		clearSessionData(req, id, 'representationError', 'cases');
	}
	next();
};
