import { isValidUuidFormat } from '@pins/crowndev-lib/util/uuid.js';
import { notFoundHandler } from '@pins/crowndev-lib/middleware/errors.js';
import { applicationLinks, crownDevelopmentToViewModel } from '../view-model.js';
import { fetchPublishedApplication } from '#util/applications.js';
import { nowIsWithinRange } from '@pins/dynamic-forms/src/lib/date-utils.js';
import { addSessionData, clearSessionData, readSessionData } from '@pins/crowndev-lib/util/session.js';
import { uniqueReference } from '@pins/crowndev-lib/util/random-reference.js';
import { viewModelToRepresentationCreateInput } from '@pins/crowndev-lib/forms/representations/view-model.js';
import { clearDataFromSession } from '@pins/dynamic-forms/src/lib/session-answer-store.js';
import { JOURNEY_ID } from './journey.js';

/**
 * @param {Object} opts
 * @param {import('@prisma/client').PrismaClient} opts.db
 * @param {import('../../../../config-types.js').Config} opts.config
 * @returns {import('express').Handler}
 */
export function buildHaveYourSayPage({ db, config }) {
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

		const crownDevelopmentFields = crownDevelopmentToViewModel(crownDevelopment, config);
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

/**
 * @param {Object} opts
 * @param {import('@prisma/client').PrismaClient} opts.db
 * @param {import('pino').Logger} logger
 * @param {function} [uniqueReferenceFn] - optional function used for testing
 * @returns {import('express').Handler}
 */
export function buildSaveHaveYourSayController({ db, logger, uniqueReferenceFn = uniqueReference }) {
	return async (req, res) => {
		const id = req.params.applicationId;

		if (!id) {
			throw new Error('id param required');
		}
		if (!isValidUuidFormat(id)) {
			return notFoundHandler(req, res);
		}
		if (!res.locals || !res.locals.journeyResponse) {
			throw new Error('journey response required');
		}
		/** @type {import('@pins/dynamic-forms/src/journey/journey-response.js').JourneyResponse} */
		const journeyResponse = res.locals.journeyResponse;
		const journey = res.locals.journey;
		/** @type {import('../types.d.ts').RepresentationCreateAnswers} */
		const answers = journeyResponse.answers;
		if (typeof answers !== 'object') {
			throw new Error('answers should be an object');
		}

		if (!journey.isComplete()) {
			const error = [
				{
					text: 'Please complete all sections before submitting',
					url: '#'
				}
			];
			addSessionData(req, id, { representationError: { text: error } });
			res.redirect(`/applications/${id}/have-your-say/check-your-answers`);
			return;
		}

		let reference;
		await db.$transaction(async ($tx) => {
			reference = await uniqueReferenceFn($tx);
			logger.info({ reference }, 'adding a new representation');
			await $tx.representation.create({
				data: viewModelToRepresentationCreateInput(answers, reference, id)
			});
			logger.info({ reference }, 'added a new representation');
		});

		clearDataFromSession({ req, journeyId: JOURNEY_ID, reqParam: 'applicationId' });
		addSessionData(req, id, { representationReference: reference, representationSubmitted: true }, 'representations');

		res.redirect(`/applications/${id}/have-your-say/success`);
	};
}

/**
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @returns {import('express').Handler}
 */
export async function viewHaveYourSaySuccessPage(req, res) {
	const id = req.params.applicationId;
	if (!id) {
		throw new Error('id param required');
	}
	if (!isValidUuidFormat(id)) {
		return notFoundHandler(req, res);
	}

	const representationReference = readSessionData(
		req,
		id,
		'representationReference',
		'reference not found',
		'representations'
	);
	const representationSubmitted = readSessionData(req, id, 'representationSubmitted', false, 'representations');

	if (!representationSubmitted && !representationReference) {
		const error = [
			{
				text: 'Something went wrong, please try submitting again',
				url: '#'
			}
		];
		addSessionData(req, id, { representationError: { text: error } });
		res.redirect(`/applications/${id}/have-your-say/check-your-answers`);
		return;
	}

	clearSessionData(req, id, ['representationReference', 'representationSubmitted'], 'representations');

	res.render('views/applications/view/have-your-say/success.njk', {
		title: 'Representation Submitted',
		bodyText: `Your reference number <br><strong>${representationReference}</strong>`,
		successBackLinkUrl: `/applications/${id}/application-information`,
		successBackLinkText: 'Back to the application information page'
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
