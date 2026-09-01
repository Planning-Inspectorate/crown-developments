import type { JourneyResponse, Question } from '@planning-inspectorate/dynamic-forms';
import {
	BOOLEAN_OPTIONS,
	Journey,
	ManageListSection,
	Section,
	whenQuestionHasAnswer
} from '@planning-inspectorate/dynamic-forms';
import type { Request } from 'express';

export const JOURNEY_ID = 'create-a-case';

/**
 * Create a new Journey instance for the "create a case" process.
 */
export function createJourney(
	questions: { [questionType: string]: Question },
	response: JourneyResponse,
	req: Request
): Journey {
	if (!req.baseUrl.endsWith('/' + JOURNEY_ID)) {
		throw new Error(`not a valid request for the ${JOURNEY_ID} journey`);
	}

	return new Journey({
		journeyId: JOURNEY_ID,
		sections: [
			new Section('Section 1', 'questions')
				.addQuestion(questions.typeOfApplication)
				.addQuestion(questions.localPlanningAuthority)
				.addQuestion(questions.hasSecondaryLpa)
				.addQuestion(questions.secondaryLocalPlanningAuthority)
				.withCondition(whenQuestionHasAnswer(questions.hasSecondaryLpa, BOOLEAN_OPTIONS.YES))
				.addQuestion(questions.hasAgent)
				.startMultiQuestionCondition('has-agent', whenQuestionHasAnswer(questions.hasAgent, BOOLEAN_OPTIONS.YES))
				.addQuestion(questions.addAgentOrganisationName)
				.addQuestion(questions.addAgentAddress)
				.addQuestion(questions.manageAgentContacts, new ManageListSection().addQuestion(questions.agentContactDetails))
				.endMultiQuestionCondition('has-agent')
				.addQuestion(
					questions.manageApplicants,
					new ManageListSection()
						.addQuestion(questions.addApplicantOrganisationName)
						.addQuestion(questions.addApplicantAddress)
				)
				.addQuestion(
					questions.manageApplicantContacts,
					new ManageListSection().addQuestion(questions.applicantContactDetails)
				)
				.addQuestion(questions.siteAddress)
				.addQuestion(questions.siteCoordinates)
				.addQuestion(questions.siteArea)
				.addQuestion(questions.developmentDescription)
				.addQuestion(questions.containsDistressingContent)
				.addQuestion(questions.expectedDateOfSubmission)
		],
		taskListUrl: 'check-your-answers',
		journeyTemplate: 'views/layouts/forms-question.njk',
		taskListTemplate: 'views/layouts/forms-check-your-answers.njk',
		journeyTitle: 'Create a case',
		returnToListing: false,
		makeBaseUrl: () => req.baseUrl,
		initialBackLink: '/cases',
		response
	});
}
