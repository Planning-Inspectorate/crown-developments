import { Address } from '@pins/dynamic-forms/src/lib/address';
import { Prisma } from '@prisma/client';

export interface CrownDevelopmentViewModel {
	reference?: string;
	description?: string;
	typeOfApplication?: string;
	lpaId?: string;
	siteAddress?: Address;
	siteNorthing?: number;
	siteEasting?: number;
	siteArea?: number;
	expectedDateOfSubmission?: Date | string;
	decisionOutcomeId?: string;
	decisionDate?: Date | string;

	updatedDate?: Date | string;
	subCategoryId?: string;
	statusId?: string;
	stageId?: string;
	lpaReference?: string;
	nationallyImportant?: boolean;
	nationallyImportantConfirmationDate?: Date | string;
	isGreenBelt?: boolean;
	siteIsVisibleFromPublicLand?: boolean;
	healthAndSafetyIssue?: string;

	lpaEmail?: string;
	lpaTelephoneNumber?: string;
	lpaAddress?: Address;

	applicantContactName?: string;
	applicantContactAddress?: Address;
	applicantContactEmail?: string;
	applicantContactTelephoneNumber?: string;
	agentContactName?: string;
	agentContactAddress?: Address;
	agentContactEmail?: string;
	agentContactTelephoneNumber?: string;

	applicationReceivedDate?: Date | string;
	applicationAcceptedDate?: Date | string;
	lpaQuestionnaireSentDate?: Date | string;
	lpaQuestionnaireReceivedDate?: Date | string;
	publishDate?: Date | string;
	pressNoticeDate?: Date | string;
	neighboursNotifiedByLpaDate?: Date | string;
	siteNoticeByLpaDate?: Date | string;
	targetDecisionDate?: Date | string;
	extendedTargetDecisionDate?: Date | string;
	recoveredDate?: Date | string;
	recoveredReportSentDate?: Date | string;
	withdrawnDate?: Date | string;
	originalDecisionDate?: Date | string;
	turnedAwayDate?: Date | string;

	representationsPeriodStartDate?: Date | string;
	representationsPeriodEndDate?: Date | string;
	representationsPublishDate?: Date | string;

	inspectorId?: string;
	assessorInspectorId?: string;
	caseOfficerId?: string;
	planningOfficerId?: string;

	eiaScreening?: boolean;
	eiaScreeningOutcome?: boolean;
	environmentalStatementReceivedDate?: Date | string;

	procedureId?: string;

	writtenRepsProcedureNotificationDate?: Date | string;

	hearingProcedureNotificationDate?: Date | string;
	hearingDate?: Date | string;
	hearingDuration?: string;
	hearingVenue?: string;
	hearingNotificationDate?: Date | string;
	hearingIssuesReportPublishedDate?: Date | string;
	hearingStatementsDate?: Date | string;
	hearingCaseManagementConferenceDate?: Date | string;

	inquiryProcedureNotificationDate?: Date | string;
	inquiryStatementsDate?: Date | string;
	inquiryDate?: Date | string;
	inquiryDuration?: string;
	inquiryVenue?: string;
	inquiryNotificationDate?: Date | string;
	inquiryCaseManagementConferenceDate?: Date | string;
	inquiryProofsOfEvidenceDate?: Date | string;
}

export type CrownDevelopmentViewModelFields = keyof CrownDevelopmentViewModel;

const viewArgs = Prisma.validator<Prisma.CrownDevelopmentDefaultArgs>()({
	include: {
		ApplicantContact: { include: { Address: true } },
		AgentContact: { include: { Address: true } },
		Category: { include: { ParentCategory: true } },
		Event: true,
		Lpa: { include: { Address: true } },
		SiteAddress: true
	}
});

// todo: this doesn't seem to work in WebStorm, but is fine in vscode
// see https://www.prisma.io/docs/orm/prisma-client/type-safety/operating-against-partial-structures-of-model-types#solution
export type CrownDevelopmentPayload = Prisma.CrownDevelopmentGetPayload<typeof viewArgs>;