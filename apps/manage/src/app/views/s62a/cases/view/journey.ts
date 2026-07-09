import { Journey, type Question, Section, type JourneyResponse } from '@planning-inspectorate/dynamic-forms';
import { getStringParam } from '@pins/crowndev-lib/util/params.ts';
import type { Request } from 'express';
import { VIEW_TAB_ID } from '@pins/crowndev-database/src/seed/s62a/data-static.ts';

export const JOURNEY_ID = 's62a-case-details';

export function createJourney(questions: Record<string, Question>, response: JourneyResponse, req: Request) {
	const id = getStringParam(req.params, 'id');
	const currentTab = getStringParam(req.params, 'tab');

	if (!req.baseUrl?.includes(id)) {
		throw new Error(`not a valid request for the ${JOURNEY_ID} journey (invalid baseUrl)`);
	}

	return new Journey({
		journeyId: JOURNEY_ID,
		sections: [
			new Section('', 'overview')
				.withSectionCondition(() => currentTab === VIEW_TAB_ID.OVERVIEW)
				.addQuestion(questions.developmentDescription),
			new Section('', 'details')
				.withSectionCondition(() => currentTab === VIEW_TAB_ID.DETAILS)
				.addQuestion(questions.applicationStatus)
		],
		taskListUrl: '',
		journeyTemplate: 'views/layouts/forms-question.njk',
		taskListTemplate: 'views/s62a/cases/view/view.njk',
		journeyTitle: 'Case details',
		returnToListing: false,
		makeBaseUrl: () => req.baseUrl,
		response
	});
}
