import type { Address } from '@planning-inspectorate/dynamic-forms/src/lib/address';
import type { Prisma } from '@pins/crowndev-database/src/client/client.ts';
import type { YesNo } from '@pins/crowndev-lib/util/types';
import type { ApplicantContact, AgentContact } from '../create-a-case/types.d.ts';

export interface CrownDevelopmentViewModel {
	reference?: string;
	description?: string;
	containsDistressingContent?: YesNo;
	typeOfApplication?: string;
	typeId: string;
	subTypeId?: string;
	lpaId?: string;
	hasSecondaryLpa?: YesNo;
	secondaryLpaId?: string;
	siteAddressId?: string;
	siteAddress?: Address;
	siteNorthing?: number | string;
	siteEasting?: number | string;
	siteArea?: number | string;
	expectedDateOfSubmission?: Date;
	decisionOutcomeId?: string;
	decisionDate?: Date;

	updatedDate?: Date;
	subCategoryId?: string;
	statusId?: string;
	stageId?: string;
	lpaReference?: string;
	nationallyImportant?: YesNo;
	nationallyImportantConfirmationDate?: Date;
	isGreenBelt?: YesNo;
	siteIsVisibleFromPublicLand?: YesNo;
	healthAndSafetyIssue?: string;
	environmentalImpactAssessment?: YesNo;
	developmentPlan?: YesNo;
	rightOfWay?: YesNo;

	lpaEmail?: string;
	lpaTelephoneNumber?: string;
	lpaAddress?: Address;

	secondaryLpaEmail?: string;
	secondaryLpaTelephoneNumber?: string;
	secondaryLpaAddress?: Address;

	hasAgent: YesNo;
	agentOrganisationName?: string;
	agentOrganisationId?: string;
	agentOrganisationAddressId?: string;
	agentOrganisationAddress?: Address;
	agentOrganisationRelationId?: string;
	manageAgentContactDetails?: ManageAgentContactDetails[];
	manageApplicantDetails?: ManageApplicantDetails[];
	manageApplicantContactDetails?: ManageApplicantContactDetails[];
	applicantContactId?: string;
	applicantContactName?: string;
	applicantContactAddress?: Address;
	applicantContactAddressId?: string;
	applicantContactEmail?: string;
	applicantContactTelephoneNumber?: string;
	agentContactId?: string;
	agentContactName?: string;
	agentContactAddress?: Address;
	agentContactAddressId?: string;
	agentContactEmail?: string;
	agentContactTelephoneNumber?: string;

	applicationReceivedDate?: Date;
	applicationReceivedDateEmailSent?: YesNo;
	applicationAcceptedDate?: Date;
	lpaQuestionnaireSentDate?: Date;
	lpaQuestionnaireSentSpecialEmailSent?: YesNo;
	lpaQuestionnaireReceivedDate?: Date;
	lpaQuestionnaireReceivedEmailSent?: YesNo;
	publishDate?: Date;
	pressNoticeDate?: Date;
	neighboursNotifiedByLpaDate?: Date;
	siteNoticeByLpaDate?: Date;
	targetDecisionDate?: Date;
	extendedTargetDecisionDate?: Date;
	recoveredDate?: Date;
	recoveredReportSentDate?: Date;
	withdrawnDate?: Date;
	originalDecisionDate?: Date;
	turnedAwayDate?: Date;
	notNationallyImportantEmailSent?: YesNo;

	representationsPeriod?: {
		start?: Date;
		end?: Date;
	};
	representationsPublishDate?: Date;

	inspector1Id?: string;
	inspector2Id?: string;
	inspector3Id?: string;
	assessorInspectorId?: string;
	caseOfficerId?: string;
	planningOfficerId?: string;

	eiaScreening?: YesNo;
	eiaScreeningOutcome?: YesNo;
	environmentalStatementReceivedDate?: Date;

	procedureId?: string;
	eventId?: string;

	writtenRepsProcedureNotificationDate?: Date;

	hearingProcedureNotificationDate?: Date;
	hearingDate?: Date;
	hearingDuration?: string;
	hearingVenue?: string;
	hearingNotificationDate?: Date;
	hearingIssuesReportPublishedDate?: Date;
	hearingDurationPrep?: number | string;
	hearingDurationSitting?: number | string;
	hearingDurationReporting?: number | string;

	inquiryProcedureNotificationDate?: Date;
	inquiryStatementsDate?: Date;
	inquiryDate?: Date;
	inquiryDuration?: string;
	inquiryVenue?: string;
	inquiryNotificationDate?: Date;
	inquiryCaseManagementConferenceDate?: Date;
	inquiryPreMeetingDate?: Date;
	inquiryProofsOfEvidenceDate?: Date;
	inquiryDurationPrep?: number | string;
	inquiryDurationSitting?: number | string;
	inquiryDurationReporting?: number | string;

	connectedApplication?: string;

	hasApplicationFee: YesNo;
	applicationFee: number;
	applicationFeeReceivedDate?: Date;
	eligibleForFeeRefund?: YesNo;
	applicationFeeRefundAmount?: string;
	applicationFeeRefundDate?: Date;
	cilLiable?: YesNo;
	cilAmount?: number | string;
	bngExempt?: YesNo;
	hasCostsApplications?: YesNo;
	costsApplicationsComment?: string;

	siteVisitDate?: Date;

	prepDuration?: number | string;
	sittingDuration?: number | string;
	reportingDuration?: number | string;
}

export type CrownJourneyAnswers = Partial<CrownDevelopmentViewModel>;

export type CrownDevelopmentViewModelFields = keyof CrownDevelopmentViewModel;

export type CrownDevelopmentPayload = Prisma.CrownDevelopmentGetPayload<{
	include: {
		ApplicantContact: { include: { Address: true } };
		AgentContact: { include: { Address: true } };
		Category: { include: { ParentCategory: true } };
		Event: true;
		Lpa: { include: { Address: true } };
		SecondaryLpa: { include: { Address: true } };
		SiteAddress: true;
		ParentCrownDevelopment: { select: { reference: true } };
		ChildrenCrownDevelopment: { select: { reference: true } };
		Organisations: {
			include: {
				Organisation: {
					include: {
						Address: true;
						OrganisationToContact: {
							include: {
								Contact: { include: { Address: true } };
							};
						};
					};
				};
			};
		};
	};
}>;

// duplicated in JS for use in code
export const CONTACT_PREFIXES = {
	APPLICANT: 'applicant',
	AGENT: 'agent'
} as const;

type ContactTypeKeys = keyof typeof CONTACT_PREFIXES;
type ContactTypeValues = (typeof CONTACT_PREFIXES)[ContactTypeKeys];

interface ManageApplicantDetails {
	id: string;
	organisationRelationId: string;
	organisationName: string;
	// eslint-disable-next-line @typescript-eslint/no-empty-object-type -- Empty object used to avoid marking question as unanswered in manage list questions.
	organisationAddress?: Address | {};
	organisationAddressId?: string;
}

export interface ManageApplicantContactDetails extends ApplicantContact {
	id: string;
	organisationToContactRelationId: string;
}

export interface ManageAgentContactDetails extends AgentContact {
	id: string;
	organisationToContactRelationId: string;
}

export interface QuestionOverrides {
	isApplicationTypePlanningOrLbc: boolean;
	isApplicationSubTypeLbc: boolean;
	filteredStageOptions?: Array<{ id: string; displayName: string }>;
	applicantOrganisationOptions?: Array<{ text: string; value: string }>;
	hasAgentAnswer: boolean;
	isQuestionView: boolean;
}
