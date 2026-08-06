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
	OUTCOME_TYPE_ID,
	PRE_APPLICATION_ADVICE_ID,
	PRE_APPLICATION_OR_APPLICATION_ID,
	VIEW_TAB_ID,
	WASTE_TYPES_WITHOUT_VOID_CAPACITY
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

	const isApplicationCase = (response: JourneyResponse) =>
		questionHasAnswer(response, questions.applicationPhase, PRE_APPLICATION_OR_APPLICATION_ID.APPLICATION);

	const isPreApplicationCase = (response: JourneyResponse) =>
		questionHasAnswer(response, questions.applicationPhase, PRE_APPLICATION_OR_APPLICATION_ID.PRE_APPLICATION);

	const isApplicationLbcCase = (response: JourneyResponse) =>
		isApplicationCase(response) && isPlanningOrLbcCase(response);

	const isApplicationCilLiableCase = (response: JourneyResponse) =>
		isApplicationCase(response) && questionHasAnswer(response, questions.cilLiable, BOOLEAN_OPTIONS.YES);

	const isApplicationAdviceGiven = (response: JourneyResponse) =>
		isApplicationCase(response) &&
		(questionHasAnswer(response, questions.preApplicationAdvice, PRE_APPLICATION_ADVICE_ID.PINS) ||
			questionHasAnswer(response, questions.preApplicationAdvice, PRE_APPLICATION_ADVICE_ID.COUNCIL));

	const showAdviceIssuedDate = (response: JourneyResponse) =>
		isPreApplicationCase(response) || isApplicationAdviceGiven(response);

	const needsVoidCapacity = (response: JourneyResponse) => {
		const wasteTypeId = response.answers?.wasteTypeId as string | undefined;
		return !!wasteTypeId && !WASTE_TYPES_WITHOUT_VOID_CAPACITY.includes(wasteTypeId);
	};
	const unitsChangeIsYes = (r: JourneyResponse) =>
		questionHasAnswer(r, questions.residentialUnitsChange, BOOLEAN_OPTIONS.YES);

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
				.endMultiQuestionCondition('has-secondary-lpa')

				.addQuestion(
					questions.manageAdditionalContacts,
					new ManageListSection()
						.addQuestion(questions.additionalContactType)
						.addQuestion(questions.additionalContactName)
						.addQuestion(questions.additionalContactAddress)
						.addQuestion(questions.additionalContactDetails)
				),
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
			new Section('', 'case-team')
				.withSectionCondition(() => currentTab === VIEW_TAB_ID.CASE_TEAM)
				.addQuestion(
					questions.manageCaseTeamInspectors,
					new ManageListSection()
						.addQuestion(questions.inspectorId)
						.addQuestion(questions.inspectorAssignedDate)
						.addQuestion(questions.inspectorAppointedDate)
				)
				.addQuestion(questions.caseOfficer)
				.addQuestion(questions.assessorInspector)
				.startMultiQuestionCondition('is-application', isApplicationCase)
				.addQuestion(questions.planningOfficer)
				.addQuestion(questions.reader)
				.endMultiQuestionCondition('is-application'),
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
				.endMultiQuestionCondition('is-application'),
			new Section('', 'event')
				.withSectionCondition(() => currentTab === VIEW_TAB_ID.EVENT)

				.startMultiQuestionCondition('event-is-application-1', isApplicationCase)
				.addQuestion(questions.noticeOfProcedureDate)
				.endMultiQuestionCondition('event-is-application-1')

				.addQuestion(questions.siteVisit)
				.addQuestion(questions.siteVisitType)

				.startMultiQuestionCondition('event-is-application-2', isApplicationCase)
				.addQuestion(questions.hearingDate)
				.addQuestion(questions.hearingDuration)
				.addQuestion(questions.hearingVenue)
				.addQuestion(questions.hearingNotificationDate)
				.addQuestion(questions.additionalMeeting)
				.addQuestion(questions.hearingIssuesReportPublishedDate)
				.endMultiQuestionCondition('event-is-application-2'),
			new Section('', 'outcome')
				.withSectionCondition(() => currentTab === VIEW_TAB_ID.OUTCOME && isApplicationCase(response))
				.addQuestion(questions.outcomeType)

				.startMultiQuestionCondition(
					'is-decision',
					whenQuestionHasAnswer(questions.outcomeType, OUTCOME_TYPE_ID.DECISION)
				)
				.addQuestion(questions.decisionOutcome)
				.addQuestion(questions.decisionDate)
				.endMultiQuestionCondition('is-decision')

				.addQuestion(questions.recoveredReportSentDate)
				.withCondition(whenQuestionHasAnswer(questions.outcomeType, OUTCOME_TYPE_ID.RECOMMENDATION)),
			new Section('', 'eia')
				.withSectionCondition(() => currentTab === VIEW_TAB_ID.EIA && isApplicationCase(response))
				.addQuestion(questions.eiaScreening)
				.startMultiQuestionCondition(
					'eia-screening-yes',
					whenQuestionHasAnswer(questions.eiaScreening, BOOLEAN_OPTIONS.YES)
				)
				.addQuestion(questions.eiaScreeningOutcome)
				.addQuestion(questions.environmentalStatementReceivedDate)
				.endMultiQuestionCondition('eia-screening-yes'),

			new Section('', 'press-notice')
				.withSectionCondition(() => currentTab === VIEW_TAB_ID.PRESS && isApplicationCase(response))
				.addQuestion(questions.pressNoticeCost)
				.addQuestion(questions.pressNoticePlaced)
				.addQuestion(questions.pressNoticeReference),
			new Section('', 'waste')
				.withSectionCondition(() => currentTab === VIEW_TAB_ID.WASTE && isApplicationCase(response))
				.addQuestion(questions.wasteActivitiesDescription)
				.addQuestion(questions.wasteManagementDevelopment)
				.addQuestion(
					questions.manageWasteTypes,
					new ManageListSection()
						.addQuestion(questions.wasteType)
						.addQuestion(questions.voidCapacity)
						.withCondition(needsVoidCapacity)
						.addQuestion(questions.maxAnnualThroughput)
				),
			new Section('', 'pre-application')
				.withSectionCondition(() => currentTab === VIEW_TAB_ID.PRE_APPLICATION)
				.startMultiQuestionCondition('pre-app-is-application-1', isApplicationCase)
				.addQuestion(questions.preApplicationAdvice)
				.addQuestion(questions.preApplicationReceivedDate)
				.endMultiQuestionCondition('pre-app-is-application-1')
				.addQuestion(questions.preApplicationAdviceIssuedDate)
				.withCondition(showAdviceIssuedDate)
				.addQuestion(questions.preApplicationReference)
				.withCondition(isApplicationAdviceGiven),
			new Section('', 'residential')
				.withSectionCondition(() => currentTab === VIEW_TAB_ID.RESIDENTIAL && isApplicationCase(response))
				.addQuestion(questions.residentialUnitsChange)
				.addQuestion(questions.totalNetGainOrLossOfUnits)
				.withCondition(unitsChangeIsYes),

			new Section('Existing residential', 'existing')
				.withSectionCondition(
					() => currentTab === VIEW_TAB_ID.RESIDENTIAL && isApplicationCase(response) && unitsChangeIsYes(response)
				)
				.addQuestion(questions.hasExistingHousing)
				.addQuestion(questions.manageExistingHousing)
				.withCondition(whenQuestionHasAnswer(questions.hasExistingHousing, BOOLEAN_OPTIONS.YES)),

			new Section('Proposed residential', 'proposed')
				.withSectionCondition(
					() => currentTab === VIEW_TAB_ID.RESIDENTIAL && isApplicationCase(response) && unitsChangeIsYes(response)
				)
				.addQuestion(questions.hasProposedHousing)
				.addQuestion(questions.manageProposedHousing)
				.withCondition(whenQuestionHasAnswer(questions.hasProposedHousing, BOOLEAN_OPTIONS.YES))
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
