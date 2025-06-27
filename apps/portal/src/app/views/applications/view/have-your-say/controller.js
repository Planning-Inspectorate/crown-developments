import { isValidUuidFormat } from '@pins/crowndev-lib/util/uuid.js';
import { notFoundHandler } from '@pins/crowndev-lib/middleware/errors.js';
import { applicationLinks, crownDevelopmentToViewModel } from '../view-model.js';
import { fetchPublishedApplication } from '#util/applications.js';
import { nowIsWithinRange } from '@pins/dynamic-forms/src/lib/date-utils.js';
import { clearSessionData, readSessionData } from '@pins/crowndev-lib/util/session.js';

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

		res.render('views/applications/view/have-your-say/view.njk', {
			pageCaption: crownDevelopmentFields.reference,
			pageTitle: 'Have your say on a Crown Development Application',
			links: applicationLinks(id, haveYourSayPeriod, representationsPublishDate),
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
 * @returns {import('express').Handler}
 */
export async function viewHaveYourSayDeclarationPage(req, res) {
	const id = req.params.applicationId;
	if (!id) {
		throw new Error('id param required');
	}
	if (!isValidUuidFormat(id)) {
		return notFoundHandler(req, res);
	}

	res.render('views/applications/view/have-your-say/declaration.njk', {
		pageTitle: 'Declaration',
		id: id,
		backLinkUrl: `check-your-answers`
	});
}

export const addRepresentationErrors = (req, res, next) => {
	const errors = readSessionData(req, req.params.id, 'representationError', [], 'cases');
	if (errors.length > 0) {
		res.locals.errorSummary = errors;
		clearSessionData(req, req.params.applicationId, 'representationError', 'cases');
	}
	next();
};
