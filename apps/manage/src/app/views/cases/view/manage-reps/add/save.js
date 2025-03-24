import { uniqueReference } from '@pins/crowndev-lib/util/random-reference.js';
import { notFoundHandler } from '@pins/crowndev-lib/middleware/errors.js';
import { isValidUuidFormat } from '@pins/crowndev-lib/util/uuid.js';
import { JOURNEY_ID } from './journey.js';
import { addSessionData, clearSessionData, readSessionData } from '@pins/crowndev-lib/util/session.js';
import { saveRepresentation } from '@pins/crowndev-lib/forms/representations/save.js';
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
		await saveRepresentation(
			{
				db,
				logger,
				journeyId: JOURNEY_ID,
				checkYourAnswersUrl: `/cases/${req.params.id}/manage-representations/add-representation/check-your-answers`,
				successUrl: `/cases/${req.params.id}/manage-representations/add-representation/success`,
				uniqueReferenceFn
			},
			req,
			res
		);
	};
}
