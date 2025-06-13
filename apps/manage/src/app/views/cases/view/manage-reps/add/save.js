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
 * @param {import('#service').ManageService} service
 * @param {function} [uniqueReferenceFn] - optional function used for testing
 * @returns {import('express').Handler}
 */
export function buildSaveRepresentationController(service, uniqueReferenceFn = uniqueReference) {
	return async (req, res) => {
		const applicationReference = await getApplicationReference(service.db, req, res);
		if (!applicationReference) {
			return; // notFoundHandler will have been called in getApplicationReference
		}
		const { db, logger, notifyClient, getSharePointDrive } = service;
		const sharePointDrive = getSharePointDrive(req.session);
		await saveRepresentation(
			{
				service: { db, logger, sharePointDrive, notifyClient },
				journeyId: JOURNEY_ID,
				checkYourAnswersUrl: `/cases/${req.params.id}/manage-representations/add-representation/check-your-answers`,
				successUrl: `/cases/${req.params.id}/manage-representations/add-representation/success`,
				applicationReference,
				uniqueReferenceFn
			},
			req,
			res
		);
	};
}

export async function getApplicationReference(db, req, res) {
	const id = req.params.id || req.params.applicationId;
	if (!id) {
		throw new Error('id param required');
	}
	if (!isValidUuidFormat(id)) {
		return notFoundHandler(req, res);
	}
	const crownDevelopment = await db.crownDevelopment.findUnique({
		where: {
			id: req.params.id
		},
		select: {
			reference: true
		}
	});
	if (!crownDevelopment) {
		return notFoundHandler(req, res);
	}

	return crownDevelopment.reference;
}
