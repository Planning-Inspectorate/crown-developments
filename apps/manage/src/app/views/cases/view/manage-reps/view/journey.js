import { Journey } from '@pins/dynamic-forms/src/journey/journey.js';
import { haveYourSayManageSections } from '@pins/crowndev-lib/forms/representations/sections.js';
import { generateJourneyTitle } from '../manage-reps-utils.js';
import { REPRESENTATION_STATUS_ID } from '@pins/crowndev-database/src/seed/data-static.js';

export const JOURNEY_ID = 'manage-representations';

/**
 * @param {Object<string, *>} questions
 * @param {import('@pins/dynamic-forms/src/journey/journey-response.js').JourneyResponse} response
 * @param {import('express').Request} req
 * @param {boolean} isRepsUploadDocsLive
 * @returns {Journey}
 */
export function createJourney(questions, response, req, isRepsUploadDocsLive) {
	if (!req.baseUrl.includes('/' + JOURNEY_ID)) {
		throw new Error(`not a valid request for the ${JOURNEY_ID} journey`);
	}

	const isViewJourney = response.answers?.statusId !== REPRESENTATION_STATUS_ID.AWAITING_REVIEW;

	return new Journey({
		journeyId: JOURNEY_ID,
		sections: haveYourSayManageSections(questions, isRepsUploadDocsLive, isViewJourney),
		taskListUrl: '',
		journeyTemplate: 'views/layouts/forms-question.njk',
		listingPageViewPath: 'views/cases/view/manage-reps/view/view.njk',
		journeyTitle: generateJourneyTitle(response.answers?.statusId),
		returnToListing: true,
		makeBaseUrl: () => req.baseUrl.replace('/review', '') + '/edit',
		initialBackLink: req.baseUrl + '/view',
		response
	});
}
