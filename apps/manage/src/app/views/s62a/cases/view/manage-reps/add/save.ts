import { uniqueReference } from '@pins/crowndev-lib/util/random-reference.js';
import { notFoundHandler } from '@pins/crowndev-lib/middleware/errors.ts';
import { isValidUuidFormat } from '@pins/crowndev-lib/util/uuid.ts';
import { JOURNEY_ID } from './journey.ts';
import { addSessionData, clearSessionData, readSessionData } from '@pins/crowndev-lib/util/session.ts';
import { getStringParam } from '@pins/crowndev-lib/util/params.ts';
import type { AsyncRequestHandler } from '@pins/crowndev-lib/util/async-handler.ts';
import type { ManageService } from '#service';
import { saveS62aRepresentation } from '@pins/crowndev-lib/forms/representations/s62a-save.ts';
import type { Request, Response } from 'express';

/**
 * Creates the success page after CYA
 */
export function viewAddRepresentationSuccessPage(req: Request, res: Response): void {
	const id = getStringParam(req.params, 'id');

	if (!isValidUuidFormat(id)) {
		return notFoundHandler(req, res);
	}

	const representationReference = readSessionData(req, id, 'representationReference', '', 'representations') as string;
	const representationSubmitted = readSessionData(req, id, 'representationSubmitted', false, 'representations');

	if (!representationSubmitted || !representationReference) {
		const error = [
			{
				text: 'Something went wrong, please try submitting again',
				url: '#'
			}
		];
		addSessionData(req, id, { representationError: { text: error } });
		res.redirect(`s62a/cases/${id}/manage-representations/add-representation/check-your-answers`);
		return;
	}

	clearSessionData(req, id, ['representationReference', 'representationSubmitted'], 'representations');

	res.render('views/s62a/cases/view/manage-reps/add/success.njk', {
		title: 'Representation added',
		bodyText: `Representation reference <br><strong>${representationReference}</strong>`,
		successBackLinkUrl: `s62a/cases/${id}`,
		successBackLinkText: 'Go back to overview'
	});
}

/**
 * Saves new rep to S62A rep model.
 */
export function buildSaveRepresentationController(
	service: ManageService,
	uniqueReferenceFn = uniqueReference
): AsyncRequestHandler {
	return async (req, res) => {
		const id = getStringParam(req.params, 'id');
		await saveS62aRepresentation(
			{
				service,
				journeyId: JOURNEY_ID,
				checkYourAnswersUrl: `/s62a/cases/${id}/manage-representations/add-representation/check-your-answers`,
				successUrl: `/s62a/cases/${id}/manage-representations/add-representation/success`,
				uniqueReferenceFn
			},
			req,
			res
		);
	};
}
