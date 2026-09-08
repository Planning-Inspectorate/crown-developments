import { Journey } from '@planning-inspectorate/dynamic-forms/src/journey/journey.js';
import { REPRESENTATION_STATUS_ID } from '@pins/crowndev-database/src/seed/data-static.ts';
import type { JourneyResponse, Question } from '@planning-inspectorate/dynamic-forms';
import type { Request } from 'express';
import { haveYourSayManageSections } from '@pins/crowndev-lib/forms/representations/s62a-sections.ts';

export const JOURNEY_ID = 's62a-manage-representations';

export function createJourney(questions: Record<string, Question>, response: JourneyResponse, req: Request) {
	if (!req.baseUrl.includes('/manage-representations')) {
		throw new Error(`not a valid request for the ${JOURNEY_ID} journey`);
	}

	const isViewJourney = response.answers?.statusId !== REPRESENTATION_STATUS_ID.AWAITING_REVIEW;

	return new Journey({
		journeyId: JOURNEY_ID,
		sections: haveYourSayManageSections(questions, isViewJourney),
		taskListUrl: '',
		journeyTemplate: 'views/layouts/forms-question.njk',
		taskListTemplate: 'views/s62a/cases/view/manage-reps/view/view.njk',
		journeyTitle: isViewJourney ? 'Review Representation' : 'View Representation',
		returnToListing: true,
		makeBaseUrl: () => req.baseUrl.replace('/review', '') + '/edit',
		initialBackLink: req.baseUrl + '/view',
		response
	});
}
