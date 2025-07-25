import { clearDataFromSession } from '@planning-inspectorate/dynamic-forms/src/lib/session-answer-store.js';
import { JOURNEY_ID } from './journey.js';
import { validateParams } from '../view/controller.js';

/**
 * @type {import('express').Handler}
 */
export function successController(req, res) {
	const { representationRef } = validateParams(req.params);
	clearDataFromSession({ req, journeyId: JOURNEY_ID });
	res.render('views/cases/view/manage-reps/withdraw/success.njk', {
		title: 'Representation Withdrawn',
		bodyText: `Representation reference <br><strong>${representationRef}</strong>`,
		successBackLinkUrl: req.baseUrl.replace(/\/withdraw-representation$/, ''),
		successBackLinkText: `Go back to overview`
	});
}
