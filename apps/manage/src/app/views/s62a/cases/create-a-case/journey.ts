import { PRE_APPLICATION_OR_APPLICATION_ID } from '@pins/crowndev-database/src/seed/s62a/data-static.ts';
import {
	type Question,
	Section,
	Journey,
	type JourneyResponse,
	whenQuestionHasAnswer,
	BOOLEAN_OPTIONS
} from '@planning-inspectorate/dynamic-forms';

import type { Request } from 'express';

export const JOURNEY_ID = 's62a-create-a-case';

export function createJourney(questions: Record<string, Question>, response: JourneyResponse, req: Request) {
	if (!req.baseUrl.endsWith('/create-a-case')) {
		throw new Error(`not a valid request for the ${JOURNEY_ID} journey`);
	}

	return new Journey({
		journeyId: JOURNEY_ID,
		sections: [
			new Section('Create', 'questions')
				.addQuestion(questions.applicationStage)

				.addQuestion(questions.applicationClassification)
				.withCondition(whenQuestionHasAnswer(questions.applicationStage, PRE_APPLICATION_OR_APPLICATION_ID.APPLICATION))

				.addQuestion(questions.applicationType)
				.addQuestion(questions.localPlanningAuthority)
				.addQuestion(questions.lpaContactDetails)
				.addQuestion(questions.hasSecondaryLpa)

				.startMultiQuestionCondition(
					'has-secondary-lpa',
					whenQuestionHasAnswer(questions.hasSecondaryLpa, BOOLEAN_OPTIONS.YES)
				)
				.addQuestion(questions.secondaryLocalPlanningAuthority)
				.addQuestion(questions.secondaryLpaContactDetails)
				.endMultiQuestionCondition('has-secondary-lpa')
		],
		taskListUrl: 'check-your-answers',
		journeyTemplate: 'views/layouts/forms-question.njk',
		taskListTemplate: 'views/layouts/forms-check-your-answers.njk',
		journeyTitle: 'S62A - Create a case',
		returnToListing: false,
		makeBaseUrl: () => req.baseUrl,
		initialBackLink: '/s62a/cases',
		response
	});
}
