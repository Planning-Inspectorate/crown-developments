import {
	Journey,
	type Question,
	Section,
	type JourneyResponse,
	questionHasAnswer,
	whenQuestionHasAnswer,
	BOOLEAN_OPTIONS
} from '@planning-inspectorate/dynamic-forms';
import { getStringParam } from '@pins/crowndev-lib/util/params.ts';
import type { Request } from 'express';
import { VIEW_TAB_ID } from '@pins/crowndev-database/src/seed/s62a/data-static.ts';
import { APPLICATION_TYPE_ID } from '@pins/crowndev-database/src/seed/data-static.ts';

export const JOURNEY_ID = 's62a-case-details';

export function createJourney(questions: Record<string, Question>, response: JourneyResponse, req: Request) {
	const id = getStringParam(req.params, 'id');
	const currentTab = getStringParam(req.params, 'tab');

	if (!req.baseUrl?.includes(id)) {
		throw new Error(`not a valid request for the ${JOURNEY_ID} journey (invalid baseUrl)`);
	}

	const isPlanningOrLbcCase = (response: JourneyResponse) =>
		questionHasAnswer(response, questions.applicationType, APPLICATION_TYPE_ID.PLANNING_AND_LISTED_BUILDING_CONSENT);

	return new Journey({
		journeyId: JOURNEY_ID,
		sections: [
			new Section('', 'overview')
				.withSectionCondition(() => currentTab === VIEW_TAB_ID.OVERVIEW)
				.addQuestion(questions.reference)
				.addQuestion(questions.developmentDescription)
				.addQuestion(questions.likelyIssues)
				.addQuestion(questions.applicationType)
				.addQuestion(questions.applicationSubType)
				.withCondition(isPlanningOrLbcCase)

				.addQuestion(questions.applicationClassification)
				.addQuestion(questions.applicationPhase)
				.addQuestion(questions.specialism)

				.addQuestion(questions.inspectorBand)
				.addQuestion(questions.localPlanningAuthority)
				.addQuestion(questions.hasSecondaryLpa)
				.addQuestion(questions.secondaryLocalPlanningAuthority)
				.withCondition(whenQuestionHasAnswer(questions.hasSecondaryLpa, BOOLEAN_OPTIONS.YES))

				.addQuestion(questions.siteAddress)
				.addQuestion(questions.siteCoordinates)
				.addQuestion(questions.siteVisibility)
				.addQuestion(questions.siteArea)

				.addQuestion(questions.expectedSubmissionDate),
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
