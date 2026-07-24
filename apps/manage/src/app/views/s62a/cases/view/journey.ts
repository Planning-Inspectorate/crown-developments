import {
	Journey,
	type Question,
	Section,
	type JourneyResponse,
	questionHasAnswer,
	whenQuestionHasAnswer,
	BOOLEAN_OPTIONS,
	ManageListSection
} from '@planning-inspectorate/dynamic-forms';
import { getStringParam } from '@pins/crowndev-lib/util/params.ts';
import type { Request } from 'express';
import {
	APPLICANT_TYPE_ID,
	PRE_APPLICATION_OR_APPLICATION_ID,
	VIEW_TAB_ID
} from '@pins/crowndev-database/src/seed/s62a/data-static.ts';
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
				.addQuestion(questions.applicationStatus),

			new Section('', 'contacts')
				.withSectionCondition(() => currentTab === VIEW_TAB_ID.CONTACTS)

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

				.addQuestion(questions.hasAgent)
				.startMultiQuestionCondition('has-agent', whenQuestionHasAnswer(questions.hasAgent, BOOLEAN_OPTIONS.YES))
				.addQuestion(questions.agentName)
				.addQuestion(questions.agentAddress)
				.addQuestion(questions.manageAgentContacts, new ManageListSection().addQuestion(questions.agentContactDetails))
				.endMultiQuestionCondition('has-agent')

				.addQuestion(questions.lpaContactDetails)
				.addQuestion(questions.lpaAddress)

				.startMultiQuestionCondition(
					'has-secondary-lpa',
					whenQuestionHasAnswer(questions.hasSecondaryLpa, BOOLEAN_OPTIONS.YES)
				)
				.addQuestion(questions.secondaryLpaContactDetails)
				.addQuestion(questions.secondaryLpaAddress)
				.endMultiQuestionCondition('has-secondary-lpa'),
			new Section('', 'dates')
				.withSectionCondition(() => currentTab === VIEW_TAB_ID.DATES)
				/**
				 * Both pre-app and app questions
				 */
				.addQuestion(questions.notificationReceivedDate)
				.addQuestion(questions.applicationReceivedDate)

				/**
				 * App questions
				 */
				.startMultiQuestionCondition(
					'is-application',
					whenQuestionHasAnswer(questions.applicationPhase, PRE_APPLICATION_OR_APPLICATION_ID.APPLICATION)
				)
				.addQuestion(questions.applicationAcknowledgedDate)
				.addQuestion(questions.furtherInformationRequestedDate)
				.addQuestion(questions.agreedForAdditionalInformationDate)
				.addQuestion(questions.applicationValidDate)
				.addQuestion(questions.validLettersSentDate)
				.addQuestion(questions.lpaQuestionnaireSentDate)
				.addQuestion(questions.lpaQuestionnaireReceivedDate)
				.addQuestion(questions.targetPublishDate)
				.addQuestion(questions.publishDate)
				.addQuestion(questions.pressNoticeDate)
				.addQuestion(questions.neighboursNotifiedByLpaDate)
				.addQuestion(questions.lpaInterestedPartiesDeadlineDate)
				.addQuestion(questions.siteNoticeByLpaDate)
				.addQuestion(questions.interestedPartiesPressNoticeDeadlineDate)
				.addQuestion(questions.mineralApplicationsDate)
				.addQuestion(questions.interimFindingsDate)
				.addQuestion(questions.reconsultationDetailsDate)
				.addQuestion(questions.s106SubmittedDate)
				.addQuestion(questions.targetDecisionDate)
				.addQuestion(questions.extendedTargetDecisionDate)
				.addQuestion(questions.recoveredDate)
				.endMultiQuestionCondition('is-application')

				/**
				 * Both pre-app and app question
				 */
				.addQuestion(questions.withdrawnDate)

				/**
				 * Final app question, which must appear after the one above so
				 * cannot be in same section
				 */
				.addQuestion(questions.turnedAwayDate)
				.withCondition(
					whenQuestionHasAnswer(questions.applicationPhase, PRE_APPLICATION_OR_APPLICATION_ID.APPLICATION)
				),
			new Section('', 'representations')
				.withSectionCondition(
					() =>
						currentTab === VIEW_TAB_ID.REPRESENTATIONS &&
						// The tab should be hidden anyway, but if the user manually navigates here, this ensures that we do not show the questions accidentally
						questionHasAnswer(response, questions.applicationPhase, PRE_APPLICATION_OR_APPLICATION_ID.APPLICATION)
				)
				.addQuestion(questions.representationsPeriod)
				.addQuestion(questions.representationsPublishDate),
			new Section('', 'fee')
				.withSectionCondition(() => currentTab === VIEW_TAB_ID.FEE)

				/**
				 * Pre-application questions
				 */
				.startMultiQuestionCondition(
					'is-pre-application',
					whenQuestionHasAnswer(questions.applicationPhase, PRE_APPLICATION_OR_APPLICATION_ID.PRE_APPLICATION)
				)
				.addQuestion(questions.hasPreApplicationFee)
				.addQuestion(questions.chargingScheduleSentDate)
				.addQuestion(questions.customerNumber)
				.addQuestion(questions.invoiceDate)

				.addQuestion(questions.preApplicationFeeReceivedDate)
				.withCondition(whenQuestionHasAnswer(questions.hasPreApplicationFee, BOOLEAN_OPTIONS.YES))
				.endMultiQuestionCondition('is-pre-application')

				/**
				 * Application questions
				 */
				.startMultiQuestionCondition(
					'is-application',
					whenQuestionHasAnswer(questions.applicationPhase, PRE_APPLICATION_OR_APPLICATION_ID.APPLICATION)
				)
				.addQuestion(questions.hasApplicationFee)

				.addQuestion(questions.applicationFeeReceivedDate)
				.withCondition(whenQuestionHasAnswer(questions.hasApplicationFee, BOOLEAN_OPTIONS.YES))

				.addQuestion(questions.eligibleForFeeRefund)

				.addQuestion(questions.applicationFeeRefundDate)
				.withCondition(whenQuestionHasAnswer(questions.eligibleForFeeRefund, BOOLEAN_OPTIONS.YES))
				.endMultiQuestionCondition('is-application')
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
