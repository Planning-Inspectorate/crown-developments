import {
	APPLICANT_TYPE_ID,
	PRE_APPLICATION_OR_APPLICATION_ID
} from '@pins/crowndev-database/src/seed/s62a/data-static.ts';
import {
	type Question,
	Section,
	Journey,
	whenQuestionHasAnswer,
	BOOLEAN_OPTIONS,
	ManageListSection
} from '@planning-inspectorate/dynamic-forms';
import type { TypedJourneyResponse } from '@pins/crowndev-lib/util/journey-types.ts';
import type { Request } from 'express';
import type { CreateCaseAnswers } from './s62a-case-mapper.ts';

export const JOURNEY_ID = 's62a-create-a-case';

export function createJourney(
	questions: Record<string, Question>,
	response: TypedJourneyResponse<CreateCaseAnswers>,
	req: Request
) {
	if (!req.baseUrl.endsWith('/create-a-case')) {
		throw new Error(`not a valid request for the ${JOURNEY_ID} journey`);
	}

	return new Journey({
		journeyId: JOURNEY_ID,
		sections: [
			new Section('Create', 'questions')
				.addQuestion(questions.applicationPhase)

				.addQuestion(questions.applicationClassification)
				.withCondition(whenQuestionHasAnswer(questions.applicationPhase, PRE_APPLICATION_OR_APPLICATION_ID.APPLICATION))

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

				.addQuestion(questions.hasAgent)

				.startMultiQuestionCondition('has-agent', whenQuestionHasAnswer(questions.hasAgent, BOOLEAN_OPTIONS.YES))
				.addQuestion(questions.agentName)
				.addQuestion(questions.agentAddress)
				.addQuestion(questions.manageAgentContacts, new ManageListSection().addQuestion(questions.agentContactDetails))
				.endMultiQuestionCondition('has-agent')

				.addQuestion(questions.applicantType)

				.startMultiQuestionCondition(
					'is-organisation',
					whenQuestionHasAnswer(questions.applicantType, APPLICANT_TYPE_ID.ORGANISATION)
				)
				.addQuestion(
					questions.manageApplicantOrganisations,
					new ManageListSection()
						.addQuestion(questions.applicantOrganisationName)
						.addQuestion(questions.applicantOrganisationAddress)
				)
				.endMultiQuestionCondition('is-organisation')

				.addQuestion(
					questions.manageApplicantContactDetails,
					new ManageListSection().addQuestion(questions.applicantContactDetails)
				)
				.addQuestion(questions.siteAddress)
				.addQuestion(questions.siteCoordinates)
				.addQuestion(questions.siteArea)
				.addQuestion(questions.developmentDescription)
				.addQuestion(questions.notificationSubmittedDate)
				.addQuestion(questions.expectedSubmissionDate)
		],
		taskListUrl: 'check-your-answers',
		journeyTemplate: 'views/layouts/forms-question.njk',
		taskListTemplate: 'views/layouts/forms-check-your-answers.njk',
		journeyTitle: 'S62A - Create a case',
		returnToListing: false,
		makeBaseUrl: () => req.baseUrl,
		initialBackLink: '/s62a/cases',
		// TODO DF-46 add generic journey types to dynamic-forms
		// @ts-expect-error -- dynamic-forms' Journey class is not generic, but we know that the answers are of type CreateCaseAnswers
		response
	});
}
