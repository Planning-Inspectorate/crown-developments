import { uniqueReference } from '@pins/crowndev-lib/util/random-reference.js';
import { notFoundHandler } from '@pins/crowndev-lib/middleware/errors.js';
import { isValidUuidFormat } from '@pins/crowndev-lib/util/uuid.js';
import { JOURNEY_ID } from './journey.js';
import { addSessionData, clearSessionData, readSessionData } from '@pins/crowndev-lib/util/session.js';
import { wrapPrismaError } from '@pins/crowndev-lib/util/database.js';
import { clearDataFromSession } from '@pins/dynamic-forms/src/lib/session-answer-store.js';
import { viewModelToRepresentationCreateInput } from '@pins/crowndev-lib/forms/representations/view-model.js';
/**
 * Render add representation success page
 *
 * @returns {import('express').Handler}
 */
export async function viewAddRepresentationSuccessPage(req, res) {
	const id = req.params.id;
	if (!id) {
		throw new Error('id param required');
	}
	if (!isValidUuidFormat(id)) {
		return notFoundHandler(req, res);
	}

	const representationReference = readSessionData(req, id, 'representationReference', '', 'representations');
	const representationSubmitted = readSessionData(req, id, 'representationSubmitted', false, 'representations');

	if (!representationSubmitted || !representationReference) {
		const error = [
			{
				text: 'Something went wrong, please try submitting again',
				url: '#'
			}
		];
		addSessionData(req, id, { representationError: { text: error } });
		res.redirect(`/cases/${id}/manage-representations/add-representation/check-your-answers`);
		return;
	}

	clearSessionData(req, id, ['representationReference', 'representationSubmitted'], 'representations');

	res.render('views/cases/view/manage-reps/add/success.njk', {
		title: 'Representation added',
		bodyText: `Representation reference <br><strong>${representationReference}</strong>`,
		successBackLinkUrl: `/cases/${id}/manage-representations`,
		successBackLinkText: 'Go back to overview'
	});
}

/**
 * @param {Object} opts
 * @param {import('@prisma/client').PrismaClient} opts.db
 * @param {import('pino').Logger} opts.logger
 * @param {function} [opts.uniqueReferenceFn] - optional function used for testing
 * @returns {import('express').Handler}
 */
export function buildSaveRepresentationController({ db, logger, uniqueReferenceFn = uniqueReference }) {
	return async (req, res) => {
		const id = req.params.id;
		if (!id) {
			throw new Error('id param required');
		}
		if (!isValidUuidFormat(id)) {
			return notFoundHandler(req, res);
		}
		if (!res.locals || !res.locals.journeyResponse) {
			throw new Error('journey response required');
		}
		/** @type {import('@pins/dynamic-forms/src/journey/journey-response.js').JourneyResponse}*/
		const journeyResponse = res.locals.journeyResponse;
		const journey = res.locals.journey;
		/** @type {import('@pins/crowndev-lib/forms/representation/types.js').HaveYourSayManageModel */
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
			res.redirect(`/cases/${id}/manage-representations/add-representation/check-your-answers`);
			return;
		}

		let reference;
		try {
			await db.$transaction(async ($tx) => {
				reference = await uniqueReferenceFn($tx);
				logger.info({ reference }, 'adding a new representation');
				await $tx.representation.create({
					data: viewModelToRepresentationCreateInput(answers, reference, id)
				});
				logger.info({ reference }, 'added a new representation');
			});
			clearDataFromSession({ req, journeyId: JOURNEY_ID, reqParam: 'id' });
			addSessionData(req, id, { representationReference: reference, representationSubmitted: true }, 'representations');
		} catch (error) {
			wrapPrismaError({
				error,
				logger,
				message: 'adding a new representation',
				logParams: { id }
			});
		}

		res.redirect(`/cases/${id}/manage-representations/add-representation/success`);
	};
}
