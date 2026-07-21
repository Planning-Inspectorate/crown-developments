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
import { PRE_APPLICATION_OR_APPLICATION_ID, VIEW_TAB_ID } from '@pins/crowndev-database/src/seed/s62a/data-static.ts';
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

	const isApplicationCase = (response: JourneyResponse) =>
		questionHasAnswer(response, questions.applicationPhase, PRE_APPLICATION_OR_APPLICATION_ID.APPLICATION);

	const isPreApplicationCase = (response: JourneyResponse) =>
		questionHasAnswer(response, questions.applicationPhase, PRE_APPLICATION_OR_APPLICATION_ID.PRE_APPLICATION);

	const isApplicationLbcCase = (response: JourneyResponse) =>
		isApplicationCase(response) && isPlanningOrLbcCase(response);

	const isApplicationCilLiableCase = (response: JourneyResponse) =>
		isApplicationCase(response) && questionHasAnswer(response, questions.cilLiable, BOOLEAN_OPTIONS.YES);

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
				.addQuestion(questions.lastUpdated)
				.addQuestion(questions.createdDate)
				.startMultiQuestionCondition('details-is-application-1', isApplicationCase)
				.addQuestion(questions.category)
				.addQuestion(questions.procedure)
				.endMultiQuestionCondition('details-is-application-1')
				.addQuestion(questions.applicationStatus)
				.startMultiQuestionCondition('details-is-application-2', isApplicationCase)
				.addQuestion(questions.stage)
				.addQuestion(questions.lpaReference)
				.endMultiQuestionCondition('details-is-application-2')
				.addQuestion(questions.listedBuildingReference)
				.withCondition(isApplicationLbcCase)
				.addQuestion(questions.greenBelt)
				.addQuestion(questions.healthAndSafetyIssues)
				.addQuestion(questions.cilLiable)
				.withCondition(isApplicationCase)
				.addQuestion(questions.cilAmount)
				.withCondition(isApplicationCilLiableCase)
				.addQuestion(questions.bngExempt)
				.withCondition(isApplicationCase),
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
				.startMultiQuestionCondition('is-application', isApplicationCase)
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
				.withCondition(isApplicationCase),
			new Section('', 'representations')
				.withSectionCondition(
					() =>
						// The tab should be hidden anyway, but if the user manually navigates here, this ensures that we do not show the questions accidentally
						currentTab === VIEW_TAB_ID.REPRESENTATIONS && isApplicationCase(response)
				)
				.addQuestion(questions.representationsPeriod)
				.addQuestion(questions.representationsPublishDate),
			new Section('', 'fee')
				.withSectionCondition(() => currentTab === VIEW_TAB_ID.FEE)

				/**
				 * Pre-application questions
				 */
				.startMultiQuestionCondition('is-pre-application', isPreApplicationCase)
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
				.startMultiQuestionCondition('is-application', isApplicationCase)
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
