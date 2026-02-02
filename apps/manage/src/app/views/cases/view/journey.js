import { Section } from '@planning-inspectorate/dynamic-forms/src/section.js';
import { Journey } from '@planning-inspectorate/dynamic-forms/src/journey/journey.js';
import {
	questionHasAnswer,
	whenQuestionHasAnswer
} from '@planning-inspectorate/dynamic-forms/src/components/utils/question-has-answer.js';
import {
	APPLICATION_PROCEDURE_ID,
	APPLICATION_SUB_TYPE_ID,
	APPLICATION_TYPE_ID
} from '@pins/crowndev-database/src/seed/data-static.js';
import { yesNoToBoolean } from '@planning-inspectorate/dynamic-forms/src/components/boolean/question.js';
import { ManageListSection } from '@planning-inspectorate/dynamic-forms/src/components/manage-list/manage-list-section.js';
export const JOURNEY_ID = 'case-details';

/**
 * @param {{[questionType: string]: import('@planning-inspectorate/dynamic-forms/src/questions/question.js').Question}} questions
 * @param {import('@planning-inspectorate/dynamic-forms/src/journey/journey-response.js').JourneyResponse} response
 * @param {import('express').Request} req
 * @returns {Journey}
 */
export function createJourney(questions, response, req) {
	if (!req.params.id) {
		throw new Error(`not a valid request for the ${JOURNEY_ID} journey (no id param)`);
	}
	if (!req.baseUrl?.includes(req.params.id)) {
		throw new Error(`not a valid request for the ${JOURNEY_ID} journey (invalid baseUrl)`);
	}
	const hasSecondaryLpa = (response) => yesNoToBoolean(response.answers?.hasSecondaryLpa);
	const isWrittenReps = whenQuestionHasAnswer(questions.procedure, APPLICATION_PROCEDURE_ID.WRITTEN_REPS);
	const isInquiry = whenQuestionHasAnswer(questions.procedure, APPLICATION_PROCEDURE_ID.INQUIRY);
	const isHearing = whenQuestionHasAnswer(questions.procedure, APPLICATION_PROCEDURE_ID.HEARING);
	const isPlanningOrLbcCase = (response) =>
		questionHasAnswer(
			response,
			questions.typeOfApplication,
			APPLICATION_TYPE_ID.PLANNING_AND_LISTED_BUILDING_CONSENT
		) &&
		(questionHasAnswer(response, questions.subTypeOfApplication, APPLICATION_SUB_TYPE_ID.PLANNING_PERMISSION) ||
			questionHasAnswer(response, questions.subTypeOfApplication, APPLICATION_SUB_TYPE_ID.LISTED_BUILDING_CONSENT));
	const iscilLiable = (response) => yesNoToBoolean(response.answers?.cilLiable);
	const hasApplicationFee = (response) => yesNoToBoolean(response.answers?.hasApplicationFee);
	const feeReceived = (response) => questionHasNonNullAnswer(response, questions.applicationFeeReceivedDate);
	const eligibleForRefund = (response) => yesNoToBoolean(response.answers?.eligibleForFeeRefund);

	return new Journey({
		journeyId: JOURNEY_ID,
		sections: [
			new Section('Overview', 'overview')
				.addQuestion(questions.reference)
				.addQuestion(questions.applicantContact)
				.addQuestion(questions.description)
				.addQuestion(questions.typeOfApplication)
				.addQuestion(questions.subTypeOfApplication)
				.withCondition(isPlanningOrLbcCase)
				.addQuestion(questions.connectedApplication)
				.withCondition(isPlanningOrLbcCase)
				.addQuestion(questions.localPlanningAuthority)
				.addQuestion(questions.hasSecondaryLpa)
				.addQuestion(questions.secondaryLocalPlanningAuthority)
				.withCondition(hasSecondaryLpa)
				.addQuestion(questions.siteAddress)
				.addQuestion(questions.siteCoordinates)
				.addQuestion(questions.siteArea)
				.addQuestion(questions.expectedDateOfSubmission)
				.addQuestion(questions.decisionOutcome)
				.addQuestion(questions.decisionDate),
			new Section('Details', 'details')
				.addQuestion(questions.updatedDate)
				.addQuestion(questions.category)
				.addQuestion(questions.procedure)
				.addQuestion(questions.status)
				.addQuestion(questions.stage)
				.addQuestion(questions.lpaReference)
				.addQuestion(questions.nationallyImportant)
				.addQuestion(questions.nationallyImportantConfirmationDate)
				.addQuestion(questions.isGreenBelt)
				.addQuestion(questions.siteIsVisibleFromPublicLand)
				.addQuestion(questions.healthAndSafetyIssue)
				.addQuestion(questions.cilLiable)
				.addQuestion(questions.cilAmount)
				.withCondition(iscilLiable)
				.addQuestion(questions.bngExempt)
				.addQuestion(questions.hasCostsApplications)
				.addQuestion(questions.environmentalImpactAssessment)
				.addQuestion(questions.developmentPlan)
				.addQuestion(questions.rightOfWay),
			new Section('Contacts', 'contacts')
				.addQuestion(questions.lpaContact)
				.addQuestion(questions.lpaAddress)
				.addQuestion(questions.secondaryLpaContact)
				.withCondition(hasSecondaryLpa)
				.addQuestion(questions.secondaryLpaAddress)
				.withCondition(hasSecondaryLpa)
				.addQuestion(questions.applicantContact)
				.addQuestion(questions.applicantContactAddress)
				.addQuestion(questions.agentContact)
				.addQuestion(questions.agentContactAddress),
			new Section('Dates', 'dates')
				.addQuestion(questions.applicationReceivedDate)
				.addQuestion(questions.applicationAcceptedDate)
				.addQuestion(questions.lpaQuestionnaireSentDate)
				.addQuestion(questions.lpaQuestionnaireReceivedDate)
				.addQuestion(questions.publishDate)
				.addQuestion(questions.pressNoticeDate)
				.addQuestion(questions.neighboursNotifiedByLpaDate)
				.addQuestion(questions.siteNoticeByLpaDate)
				.addQuestion(questions.targetDecisionDate)
				.addQuestion(questions.extendedTargetDecisionDate)
				.addQuestion(questions.recoveredDate)
				.addQuestion(questions.recoveredReportSentDate)
				.addQuestion(questions.siteVisitDate)
				.addQuestion(questions.withdrawnDate)
				.addQuestion(questions.originalDecisionDate)
				.addQuestion(questions.turnedAwayDate),
			new Section('Representations Period', 'representations')
				.addQuestion(questions.representationsPeriod)
				.addQuestion(questions.representationsPublishDate),
			new Section('Case team', 'case-team')
				.addQuestion(questions.inspector1)
				.addQuestion(questions.inspector2)
				.addQuestion(questions.inspector3)
				.addQuestion(questions.assessorInspector)
				.addQuestion(questions.caseOfficer)
				.addQuestion(questions.planningOfficer),
			new Section('Environmental impact assessment', 'eia')
				.addQuestion(questions.eiaScreening)
				.addQuestion(questions.eiaScreeningOutcome)
				.addQuestion(questions.environmentalStatementReceivedDate),
			new Section('Written Reps', 'written-reps')
				.addQuestion(questions.writtenRepsProcedureNotificationDate)
				.withCondition(isWrittenReps),
			new Section('Hearing', 'hearing')
				.addQuestion(questions.hearingProcedureNotificationDate)
				.withCondition(isHearing)
				.addQuestion(questions.hearingDate)
				.withCondition(isHearing)
				.addQuestion(questions.hearingDuration)
				.withCondition(isHearing)
				.addQuestion(questions.hearingVenue)
				.withCondition(isHearing)
				.addQuestion(questions.hearingNotificationDate)
				.withCondition(isHearing)
				.addQuestion(questions.hearingIssuesReportPublishedDate)
				.withCondition(isHearing),
			new Section('Inquiry', 'inquiry')
				.addQuestion(questions.inquiryProcedureNotificationDate)
				.withCondition(isInquiry)
				.addQuestion(questions.inquiryStatementsDate)
				.withCondition(isInquiry)
				.addQuestion(questions.inquiryDate)
				.withCondition(isInquiry)
				.addQuestion(questions.inquiryDuration)
				.withCondition(isInquiry)
				.addQuestion(questions.inquiryVenue)
				.withCondition(isInquiry)
				.addQuestion(questions.inquiryNotificationDate)
				.withCondition(isInquiry)
				.addQuestion(questions.inquiryCaseManagementConferenceDate)
				.withCondition(isInquiry)
				.addQuestion(questions.inquiryPreMeetingDate)
				.withCondition(isInquiry)
				.addQuestion(questions.inquiryProofsOfEvidenceDate)
				.withCondition(isInquiry),
			new Section('Fee', 'fee')
				.addQuestion(questions.hasApplicationFee)
				.addQuestion(questions.applicationFeeReceivedDate)
				.withCondition(hasApplicationFee)
				.addQuestion(questions.eligibleForFeeRefund)
				.withCondition(feeReceived)
				.addQuestion(questions.applicationFeeRefundDate)
				.withCondition(eligibleForRefund)
		],
		taskListUrl: '',
		journeyTemplate: 'views/layouts/forms-question.njk',
		taskListTemplate: 'views/cases/view/view.njk',
		journeyTitle: 'Case details',
		returnToListing: true,
		makeBaseUrl: () => req.baseUrl,
		response
	});
}

/**
 * @param {{[questionType: string]: import('@planning-inspectorate/dynamic-forms/src/questions/question.js').Question}} questions
 * @param {import('@planning-inspectorate/dynamic-forms/src/journey/journey-response.js').JourneyResponse} response
 * @param {import('express').Request} req
 * @returns {Journey}
 */
export function createJourneyV2(questions, response, req) {
	if (!req.params.id) {
		throw new Error(`not a valid request for the ${JOURNEY_ID} journey (no id param)`);
	}
	if (!req.baseUrl?.includes(req.params.id)) {
		throw new Error(`not a valid request for the ${JOURNEY_ID} journey (invalid baseUrl)`);
	}
	const hasSecondaryLpa = (response) => yesNoToBoolean(response.answers?.hasSecondaryLpa);
	const isWrittenReps = whenQuestionHasAnswer(questions.procedure, APPLICATION_PROCEDURE_ID.WRITTEN_REPS);
	const isInquiry = whenQuestionHasAnswer(questions.procedure, APPLICATION_PROCEDURE_ID.INQUIRY);
	const isHearing = whenQuestionHasAnswer(questions.procedure, APPLICATION_PROCEDURE_ID.HEARING);
	const isPlanningOrLbcCase = (response) =>
		questionHasAnswer(
			response,
			questions.typeOfApplication,
			APPLICATION_TYPE_ID.PLANNING_AND_LISTED_BUILDING_CONSENT
		) &&
		(questionHasAnswer(response, questions.subTypeOfApplication, APPLICATION_SUB_TYPE_ID.PLANNING_PERMISSION) ||
			questionHasAnswer(response, questions.subTypeOfApplication, APPLICATION_SUB_TYPE_ID.LISTED_BUILDING_CONSENT));
	const iscilLiable = (response) => yesNoToBoolean(response.answers?.cilLiable);
	const hasApplicationFee = (response) => yesNoToBoolean(response.answers?.hasApplicationFee);
	const feeReceived = (response) => questionHasNonNullAnswer(response, questions.applicationFeeReceivedDate);
	const eligibleForRefund = (response) => yesNoToBoolean(response.answers?.eligibleForFeeRefund);

	return new Journey({
		journeyId: JOURNEY_ID,
		sections: [
			new Section('Overview', 'overview')
				.addQuestion(questions.reference)
				.addQuestion(questions.applicantContact)
				.addQuestion(questions.description)
				.addQuestion(questions.typeOfApplication)
				.addQuestion(questions.subTypeOfApplication)
				.withCondition(isPlanningOrLbcCase)
				.addQuestion(questions.connectedApplication)
				.withCondition(isPlanningOrLbcCase)
				.addQuestion(questions.localPlanningAuthority)
				.addQuestion(questions.hasSecondaryLpa)
				.addQuestion(questions.secondaryLocalPlanningAuthority)
				.withCondition(hasSecondaryLpa)
				.addQuestion(questions.siteAddress)
				.addQuestion(questions.siteCoordinates)
				.addQuestion(questions.siteArea)
				.addQuestion(questions.expectedDateOfSubmission)
				.addQuestion(questions.decisionOutcome)
				.addQuestion(questions.decisionDate),
			new Section('Details', 'details')
				.addQuestion(questions.updatedDate)
				.addQuestion(questions.category)
				.addQuestion(questions.procedure)
				.addQuestion(questions.status)
				.addQuestion(questions.stage)
				.addQuestion(questions.lpaReference)
				.addQuestion(questions.nationallyImportant)
				.addQuestion(questions.nationallyImportantConfirmationDate)
				.addQuestion(questions.isGreenBelt)
				.addQuestion(questions.siteIsVisibleFromPublicLand)
				.addQuestion(questions.healthAndSafetyIssue)
				.addQuestion(questions.cilLiable)
				.addQuestion(questions.cilAmount)
				.withCondition(iscilLiable)
				.addQuestion(questions.bngExempt)
				.addQuestion(questions.hasCostsApplications)
				.addQuestion(questions.environmentalImpactAssessment)
				.addQuestion(questions.developmentPlan)
				.addQuestion(questions.rightOfWay),
			new Section('Contacts', 'contacts')
				.addQuestion(questions.lpaContact)
				.addQuestion(questions.lpaAddress)
				.addQuestion(questions.secondaryLpaContact)
				.withCondition(hasSecondaryLpa)
				.addQuestion(questions.secondaryLpaAddress)
				.withCondition(hasSecondaryLpa)
				.addQuestion(
					questions.manageApplicants,
					new ManageListSection().addQuestion(questions.addApplicantName).addQuestion(questions.addApplicantAddress)
				),
			new Section('Dates', 'dates')
				.addQuestion(questions.applicationReceivedDate)
				.addQuestion(questions.applicationAcceptedDate)
				.addQuestion(questions.lpaQuestionnaireSentDate)
				.addQuestion(questions.lpaQuestionnaireReceivedDate)
				.addQuestion(questions.publishDate)
				.addQuestion(questions.pressNoticeDate)
				.addQuestion(questions.neighboursNotifiedByLpaDate)
				.addQuestion(questions.siteNoticeByLpaDate)
				.addQuestion(questions.targetDecisionDate)
				.addQuestion(questions.extendedTargetDecisionDate)
				.addQuestion(questions.recoveredDate)
				.addQuestion(questions.recoveredReportSentDate)
				.addQuestion(questions.siteVisitDate)
				.addQuestion(questions.withdrawnDate)
				.addQuestion(questions.originalDecisionDate)
				.addQuestion(questions.turnedAwayDate),
			new Section('Representations Period', 'representations')
				.addQuestion(questions.representationsPeriod)
				.addQuestion(questions.representationsPublishDate),
			new Section('Case team', 'case-team')
				.addQuestion(questions.inspector1)
				.addQuestion(questions.inspector2)
				.addQuestion(questions.inspector3)
				.addQuestion(questions.assessorInspector)
				.addQuestion(questions.caseOfficer)
				.addQuestion(questions.planningOfficer),
			new Section('Environmental impact assessment', 'eia')
				.addQuestion(questions.eiaScreening)
				.addQuestion(questions.eiaScreeningOutcome)
				.addQuestion(questions.environmentalStatementReceivedDate),
			new Section('Written Reps', 'written-reps')
				.addQuestion(questions.writtenRepsProcedureNotificationDate)
				.withCondition(isWrittenReps),
			new Section('Hearing', 'hearing')
				.addQuestion(questions.hearingProcedureNotificationDate)
				.withCondition(isHearing)
				.addQuestion(questions.hearingDate)
				.withCondition(isHearing)
				.addQuestion(questions.hearingDuration)
				.withCondition(isHearing)
				.addQuestion(questions.hearingVenue)
				.withCondition(isHearing)
				.addQuestion(questions.hearingNotificationDate)
				.withCondition(isHearing)
				.addQuestion(questions.hearingIssuesReportPublishedDate)
				.withCondition(isHearing),
			new Section('Inquiry', 'inquiry')
				.addQuestion(questions.inquiryProcedureNotificationDate)
				.withCondition(isInquiry)
				.addQuestion(questions.inquiryStatementsDate)
				.withCondition(isInquiry)
				.addQuestion(questions.inquiryDate)
				.withCondition(isInquiry)
				.addQuestion(questions.inquiryDuration)
				.withCondition(isInquiry)
				.addQuestion(questions.inquiryVenue)
				.withCondition(isInquiry)
				.addQuestion(questions.inquiryNotificationDate)
				.withCondition(isInquiry)
				.addQuestion(questions.inquiryCaseManagementConferenceDate)
				.withCondition(isInquiry)
				.addQuestion(questions.inquiryPreMeetingDate)
				.withCondition(isInquiry)
				.addQuestion(questions.inquiryProofsOfEvidenceDate)
				.withCondition(isInquiry),
			new Section('Fee', 'fee')
				.addQuestion(questions.hasApplicationFee)
				.addQuestion(questions.applicationFeeReceivedDate)
				.withCondition(hasApplicationFee)
				.addQuestion(questions.eligibleForFeeRefund)
				.withCondition(feeReceived)
				.addQuestion(questions.applicationFeeRefundDate)
				.withCondition(eligibleForRefund)
		],
		taskListUrl: '',
		journeyTemplate: 'views/layouts/forms-question.njk',
		taskListTemplate: 'views/cases/view/view.njk',
		journeyTitle: 'Case details',
		returnToListing: true,
		makeBaseUrl: () => req.baseUrl,
		response
	});
}

export const questionHasNonNullAnswer = (response, question) => {
	if (!response.answers) return false;
	if (!question || !question.fieldName) return false;
	const answerField = response.answers[question.fieldName];
	return answerField !== null && answerField !== undefined;
};
