import { Journey } from '@pins/dynamic-forms/src/journey/journey.js';
import { addRepresentationSection } from '@pins/crowndev-lib/forms/representations/sections.js';

export const JOURNEY_ID = 'add-representation';

export function createJourney(questions, response, req, isRepsUploadDocsLive) {
	if (!req.baseUrl.endsWith('/' + JOURNEY_ID)) {
		throw new Error(`not a valid request for the ${JOURNEY_ID} journey`);
	}

	return new Journey({
		journeyId: JOURNEY_ID,
		sections: addRepresentationSection(questions, isRepsUploadDocsLive),
		taskListUrl: 'check-your-answers',
		journeyTemplate: 'views/layouts/forms-question.njk',
		listingPageViewPath: 'views/layouts/forms-representation-check-your-answers.njk',
		journeyTitle: 'Add representation',
		returnToListing: false,
		makeBaseUrl: () => req.baseUrl,
		initialBackLink: `/cases/${req.params?.id}/manage-representations`,
		response
	});
}
