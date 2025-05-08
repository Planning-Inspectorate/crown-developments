import { JOURNEY_ID } from '../view/journey.js';
import TextEntryRedactQuestion from '@pins/dynamic-forms/src/components/text-entry-redact/question.js';
import { Journey } from '@pins/dynamic-forms/src/journey/journey.js';
import { Section } from '@pins/dynamic-forms/src/section.js';
import { generateJourneyTitle } from '../manage-reps-utils.js';

/**
 * @param {import('@pins/dynamic-forms/src/journey/journey-response.js').JourneyResponse} response
 * @param {import('express').Request} req
 * @returns {Journey}
 */
export function createRedactJourney(response, req) {
	if (!req.baseUrl.includes('/' + JOURNEY_ID + '/')) {
		throw new Error(`not a valid request for the ${JOURNEY_ID} journey`);
	}

	return new Journey({
		journeyId: JOURNEY_ID,
		sections: [
			new Section('Section 1', 'questions').addQuestion(
				new TextEntryRedactQuestion({
					fieldName: 'comment',
					url: 'redact',
					question: 'Redact Representation',
					title: 'Redact Representation'
				})
			)
		],
		taskListUrl: '',
		journeyTemplate: 'views/layouts/forms-question.njk',
		listingPageViewPath: 'views/cases/view/manage-reps/view/view.njk',
		journeyTitle: generateJourneyTitle(response.answers?.statusId),
		initialBackLink: req.baseUrl,
		returnToListing: false,
		makeBaseUrl: () => req.baseUrl,
		response
	});
}
