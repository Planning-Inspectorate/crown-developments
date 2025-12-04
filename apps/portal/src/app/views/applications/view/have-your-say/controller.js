import { isValidUuidFormat } from '@pins/crowndev-lib/util/uuid.js';
import { notFoundHandler } from '@pins/crowndev-lib/middleware/errors.js';
import { applicationLinks, crownDevelopmentToViewModel } from '../view-model.js';
import { fetchPublishedApplication } from '#util/applications.js';
import { nowIsWithinRange } from '@planning-inspectorate/dynamic-forms/src/lib/date-utils.js';
import { clearSessionData, readSessionData } from '@pins/crowndev-lib/util/session.js';
import { shouldDisplayApplicationUpdatesLink } from '../../../util/application-util.js';
import {
	buildRequiredCheckboxGroup,
	declarationItems,
	CheckboxValidator,
	normaliseCheckboxValues
} from '@pins/crowndev-lib/forms/custom-components/checkbox-validation/checkbox-validation.js';

/**
 * Builds Have Your Say landing page.
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
 * Ensures representations window is open.
 * @param { import('@pins/crowndev-database').PrismaClient } db
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
 * GET /declaration
 * If POST errors exist, rebuild items with per-item hint messages via buildRequiredCheckboxGroup.
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 */
export async function viewHaveYourSayDeclarationPage(req, res) {
	const id = req.params?.applicationId;
	if (!id) {
		throw new Error('id param required');
	}
	if (!isValidUuidFormat(id)) {
		return notFoundHandler(req, res);
	}

	let declarationCheckbox;
	if (res.locals?.errorSummary) {
		const submitted = req.body?.declaration;
		const validator = new CheckboxValidator('Declaration', {
			emptyErrorMessage: 'You must confirm all statements to continue'
		});
		const group = buildRequiredCheckboxGroup(submitted, declarationItems, {
			idPrefix: 'declaration',
			validator
		});
		declarationCheckbox = {
			name: 'declaration',
			idPrefix: 'declaration',
			items: group.items
		};
	} else {
		declarationCheckbox = {
			name: 'declaration',
			idPrefix: 'declaration',
			items: declarationItems.map((item) => ({
				value: item.value,
				text: item.text,
				html: item.html,
				checked: false
			}))
		};
	}

	return res.render('views/applications/view/have-your-say/declaration.njk', {
		pageTitle: 'Declaration',
		id,
		backLinkUrl: `check-your-answers`,
		declarationCheckbox,
		errorSummary: res.locals?.errorSummary
	});
}

/**
 * POST /declaration
 * Validation middleware. On failure, re-renders with per-item hints and component-level errorMessage.
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
export async function declarationValidator(req, res, next) {
	const submitted = req.body?.declaration;

	const validator = new CheckboxValidator('Declaration', {
		emptyErrorMessage: 'You must confirm all statements to continue'
	});

	const group = buildRequiredCheckboxGroup(submitted, declarationItems, {
		idPrefix: 'declaration',
		validator
	});

	if (!group.valid) {
		res.locals = res.locals || {};
		res.locals.errorSummary = group.errorSummary;
		if (typeof res.status === 'function') {
			res.status(400);
		}
		return await viewHaveYourSayDeclarationPage(req, res);
	}
	req.body.declaration = normaliseCheckboxValues(submitted);
	return next();
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
