import { addRepresentationSection } from '@pins/crowndev-lib/forms/representations/s62a-sections.ts';
import { getStringParam } from '@pins/crowndev-lib/util/params.ts';
import { Journey, type JourneyResponse, type Question } from '@planning-inspectorate/dynamic-forms';
import type { Request } from 'express';

export const JOURNEY_ID = 's62a-add-representation';

export function createJourney(questions: Record<string, Question>, response: JourneyResponse, req: Request) {
	if (!req.baseUrl.endsWith('/' + 'add-representation')) {
		throw new Error(`not a valid request for the ${JOURNEY_ID} journey`);
	}

	const id = getStringParam(req.params, 'id');

	return new Journey({
		journeyId: JOURNEY_ID,
		sections: addRepresentationSection(questions),
		taskListUrl: 'check-your-answers',
		journeyTemplate: 'views/layouts/forms-question.njk',
		taskListTemplate: 'views/layouts/forms-representation-check-your-answers.njk',
		journeyTitle: 'Add representation',
		returnToListing: false,
		makeBaseUrl: () => req.baseUrl,
		initialBackLink: `/s62a/cases/${id}/manage-representations`,
		response
	});
}
