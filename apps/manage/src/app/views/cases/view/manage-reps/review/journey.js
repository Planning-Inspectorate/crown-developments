import { JOURNEY_ID } from '../view/journey.js';
import TextEntryRedactQuestion from '@planning-inspectorate/dynamic-forms/src/components/text-entry-redact/question.js';
import { Journey } from '@planning-inspectorate/dynamic-forms/src/journey/journey.js';
import { Section } from '@planning-inspectorate/dynamic-forms/src/section.js';
import { generateJourneyTitle } from '../manage-reps-utils.js';

/**
 * @param {import('@planning-inspectorate/dynamic-forms/src/journey/journey-response.js').JourneyResponse} response
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
					question: 'Redact representation',
					title: 'Redact representation',
					summaryText: 'Original representation',
					showSuggestionsUi: true
				})
			)
		],
		taskListUrl: '',
		journeyTemplate: 'views/layouts/forms-question.njk',
		taskListTemplate: 'views/cases/view/manage-reps/view/view.njk',
		journeyTitle: generateJourneyTitle(response.answers?.statusId),
		initialBackLink: req.originalUrl?.replace('/redact', ''),
		returnToListing: false,
		makeBaseUrl: () => req.baseUrl,
		response
	});
}
