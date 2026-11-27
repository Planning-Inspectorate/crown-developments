import type { Prisma } from '@pins/crowndev-database/src/client/client.ts';
import type { Schemas } from '@planning-inspectorate/data-model';
import {
	APPLICATION_TYPES,
	APPLICATION_SUB_TYPES,
	ORGANISATION_ROLES_ID,
	CONTACT_PREFERENCE_ID,
	APPLICATION_STATUS,
	APPLICATION_STAGE,
	CATEGORIES,
	APPLICATION_DECISION_OUTCOME,
	APPLICATION_PROCEDURE,
	APPLICATION_PROCEDURE_ID
} from '@pins/crowndev-database/src/seed/data-static.ts';
import { CASE_TYPE } from '@pins/crowndev-lib/odw/odw-publisher.ts';
import { mapToCoordinatesString } from '@pins/crowndev-lib/util/site-coordinates.ts';

const addressSelect = {
	id: true,
	line1: true,
	line2: true,
	townCity: true,
	county: true,
	postcode: true
} as const satisfies Prisma.AddressSelect;

export const organisationsArgs = {
	select: {
		role: true,
		organisationId: true,
		Organisation: {
			select: {
				name: true,
				Address: { select: addressSelect },
				OrganisationToContact: {
					select: {
						Contact: {
							select: {
								id: true,
								contactPreferenceId: true,
								orgName: true,
								jobTitleOrRole: true
							}
						}
					}
				}
			}
		}
	}
} as const satisfies Prisma.CrownDevelopment$OrganisationsArgs;

export const crownDevelopmentOdwInclude = {
	Lpa: { select: { pinsCode: true } },
	SecondaryLpa: { select: { pinsCode: true } },
	Organisations: { ...organisationsArgs },
	SiteAddress: true,
	Event: true
} as const satisfies Prisma.CrownDevelopmentInclude;

export type CrownDevelopmentOdwPayload = Prisma.CrownDevelopmentGetPayload<{
	include: typeof crownDevelopmentOdwInclude;
}>;

type OrganisationPayload = CrownDevelopmentOdwPayload['Organisations'][number];
type AddressPayload = Prisma.AddressGetPayload<{ select: typeof addressSelect }>;

// TODO: this mapper is growing quite a lot, maybe break it into type of data to make it more readable?
export function mapCrownDevelopmentToOdwSchema(
	update: CrownDevelopmentOdwPayload
): Schemas.CrownDevelopmentApplication {
	return {
		id: update.id,
		reference: update.reference,
		createdDate: update.createdDate.toISOString(),
		type: formatType(update.typeId),
		hasAgent: update.hasAgent,
		caseType: CASE_TYPE.crown,
		updatedDate: update.updatedDate?.toISOString() ?? null,
		subType: formatSubType(update.subTypeId),
		linkedParentId: update.linkedParentId,
		description: update.description,
		primaryLPACode: update.Lpa.pinsCode ?? undefined, // Should always be set but a pinsCode might not exist
		secondaryLPACode: update.SecondaryLpa?.pinsCode ?? null, // TODO:
		organisations: update.Organisations.map(mapOrganisations),
		siteAddress: update.SiteAddress ? [mapAddress(update.SiteAddress)] : null,
		siteEasting: update.siteEasting !== null ? mapToCoordinatesString(update.siteEasting) : null,
		siteNorthing: update.siteNorthing !== null ? mapToCoordinatesString(update.siteNorthing) : null,
		siteArea: update.siteArea?.toNumber() ?? null,
		expectedDateOfSubmission: update.expectedDateOfSubmission?.toISOString() ?? null,
		applicationStatus: update.statusId ? formatStatus(update.statusId) : undefined,
		applicationStage: formatStage(update.stageId), // TODO: Review Hearing stage as it doesn't match in ODW (unsure if that is intended)
		nationallyImportant: update.nationallyImportant,
		nationallyImportantConfirmationDate: update.nationallyImportantConfirmationDate?.toISOString() ?? null,
		notNationallyImportantEmailSent: update.notNationallyImportantEmailSent, // TODO: I don't think email flags need to be sent to ODW, might be worth removing?
		containsDistressingContent: update.containsDistressingContent,
		lpaReference: update.lpaReference,
		category: formatCategory(update.categoryId),
		isGreenBelt: update.isGreenBelt,
		healthAndSafetyIssue: update.healthAndSafetyIssue, // TODO: type discrepancy here - should it be a string because it contains details or does ODW only care if it has issues
		applicationReceivedDate: update.applicationReceivedDate?.toISOString() ?? null,
		applicationReceivedDateEmailSent: update.applicationReceivedDateEmailSent, // TODO: I don't think email flags need to be sent to ODW, might be worth removing?
		applicationAcceptedDate: update.applicationAcceptedDate?.toISOString() ?? null,
		lpaQuestionnaireSentDate: update.lpaQuestionnaireSentDate?.toISOString() ?? null,
		lpaQuestionnaireReceivedDate: update.lpaQuestionnaireReceivedDate?.toISOString() ?? null,
		lpaQuestionnaireReceivedEmailSent: update.lpaQuestionnaireReceivedEmailSent, // TODO: I don't think email flags need to be sent to ODW, might be worth removing?
		publishDate: update.publishDate?.toISOString() ?? null,
		pressNoticeDate: update.pressNoticeDate?.toISOString() ?? null,
		neighboursNotifiedByLpaDate: update.neighboursNotifiedByLpaDate?.toISOString() ?? null,
		siteNoticeByLpaDate: update.siteNoticeByLpaDate?.toISOString() ?? null,
		targetDecisionDate: update.targetDecisionDate?.toISOString() ?? null,
		extendedTargetDecisionDate: update.extendedTargetDecisionDate?.toISOString() ?? null,
		recoveredDate: update.recoveredDate?.toISOString() ?? null,
		recoveredReportSentDate: update.recoveredReportSentDate?.toISOString() ?? null,
		withdrawnDate: update.withdrawnDate?.toISOString() ?? null,
		decisionDate: update.decisionDate?.toISOString() ?? null,
		originalDecisionDate: update.originalDecisionDate?.toISOString() ?? null,
		decisionOutcome: formatDecisionOutcome(update.decisionOutcomeId),
		turnedAwayDate: update.turnedAwayDate?.toISOString() ?? null,
		representationsPublishDate: update.representationsPublishDate?.toISOString() ?? null,
		representationsPeriodStartDate: update.representationsPeriodStartDate?.toISOString() ?? null,
		representationsPeriodEndDate: update.representationsPeriodEndDate?.toISOString() ?? null,
		// TODO: CROWN-1806 - Manage list to change our approach
		inspector1Id: update.inspector1Id,
		inspector2Id: update.inspector2Id,
		inspector3Id: update.inspector3Id,
		assessorInspectorId: update.assessorInspectorId,

		caseOfficerId: update.caseOfficerId,
		planningOfficerId: update.planningOfficerId,
		eiaScreening: update.eiaScreening,
		eiaScreeningOutcome: formatEiaScreeningOutcome(update.eiaScreeningOutcome),
		environmentalStatementReceivedDate: update.environmentalStatementReceivedDate?.toISOString() ?? null,
		environmentalImpactAssessment: update.environmentalImpactAssessment,
		siteIsVisibleFromPublicLand: update.siteIsVisibleFromPublicLand,
		procedure: formatProcedure(update.procedureId), // see formatter
		procedureNotificationDate: update.procedureNotificationDate?.toISOString() ?? null,
		eventDate: update.Event?.date?.toISOString() ?? null,
		eventPrepDuration: update.Event?.prepDuration?.toNumber() ?? null,
		eventSittingDuration: update.Event?.sittingDuration?.toNumber() ?? null,
		eventReportingDuration: update.Event?.reportingDuration?.toNumber() ?? null,
		eventVenue: update.Event?.venue ?? null,
		eventNotificationDate: update.Event?.notificationDate?.toISOString() ?? null,
		eventIssuesReportPublishedDate: update.Event?.issuesReportPublishedDate?.toISOString() ?? null,
		eventStatementsDate: update.Event?.statementsDate?.toISOString() ?? null,
		eventCaseManagementConferenceDate: update.Event?.caseManagementConferenceDate?.toISOString() ?? null,
		eventPreMeetingDate: update.Event?.preMeetingDate?.toISOString() ?? null,
		eventProofsOfEvidenceDate: update.Event?.proofsOfEvidenceDate?.toISOString() ?? null,
		hasApplicationFee: update.hasApplicationFee,
		applicationFee: update.applicationFee?.toNumber() ?? null,
		applicationFeeReceivedDate: update.applicationFeeReceivedDate?.toISOString() ?? null,
		eligibleForFeeRefund: update.eligibleForFeeRefund,
		applicationFeeRefundAmount: update.applicationFeeRefundAmount?.toNumber() ?? null,
		applicationFeeRefundDate: update.applicationFeeRefundDate?.toISOString() ?? null,
		siteVisitDate: update.siteVisitDate?.toISOString() ?? null,
		cilLiable: update.cilLiable,
		cilAmount: update.cilAmount?.toNumber() ?? null,
		bngExempt: update.bngExempt,
		hasCostsApplications: update.hasCostsApplications,
		costsApplicationsComment: update.costsApplicationsComment,
		developmentPlan: update.developmentPlan, // TODO: Probably don't need this as it is only used for emails
		rightOfWay: update.rightOfWay // TODO: see above
	};
}

// TODO: I considered making a generic id to display name function
//  but I think some of them need to be dealt with differently (see nulls etc)
//  could make 2 (nullable vs non-nullable) TBC
function formatType(typeId: CrownDevelopmentOdwPayload['typeId']) {
	const type = APPLICATION_TYPES.find((t) => t.id === typeId);
	if (!type) {
		throw new Error(`Unknown typeId: ${typeId}`);
	}
	return type.displayName;
}

function formatSubType(subTypeId: CrownDevelopmentOdwPayload['subTypeId']) {
	if (subTypeId === null) {
		return null;
	}
	const subtype = APPLICATION_SUB_TYPES.find((st) => st.id === subTypeId);
	if (!subtype) {
		throw new Error(`Unknown subTypeId: ${subTypeId}`);
	}
	return subtype.displayName;
}

function formatStatus(statusId: CrownDevelopmentOdwPayload['statusId']) {
	const status = APPLICATION_STATUS.find((s) => s.id === statusId);
	if (!status) {
		throw new Error(`Unknown statusId: ${statusId}`);
	}
	return status.displayName;
}

function formatStage(stageId: CrownDevelopmentOdwPayload['stageId']) {
	if (stageId === null) {
		return null;
	}
	const stage = APPLICATION_STAGE.find((s) => s.id === stageId);
	if (!stage) {
		throw new Error(`Unknown stageId: ${stageId}`);
	}
	return stage.displayName;
}

function formatCategory(categoryId: CrownDevelopmentOdwPayload['categoryId']) {
	if (categoryId === null) {
		return null;
	}
	const category = CATEGORIES.find((c) => c.id === categoryId);
	if (!category) {
		throw new Error(`Unknown categoryId: ${categoryId}`);
	}
	return category.displayName;
}

function formatDecisionOutcome(decisionOutcomeId: CrownDevelopmentOdwPayload['decisionOutcomeId']) {
	if (decisionOutcomeId === null) {
		return null;
	}
	const decisionOutcome = APPLICATION_DECISION_OUTCOME.find((d) => d.id === decisionOutcomeId);
	if (!decisionOutcome) {
		throw new Error(`Unknown decisionOutcomeId: ${decisionOutcomeId}`);
	}
	return decisionOutcome.displayName;
}

function formatEiaScreeningOutcome(eiaScreeningOutcome: CrownDevelopmentOdwPayload['eiaScreeningOutcome']) {
	if (typeof eiaScreeningOutcome === 'boolean') {
		return eiaScreeningOutcome ? 'required' : 'not required';
	}
	return eiaScreeningOutcome;
}

function mapOrganisations(update: OrganisationPayload): Schemas.Organisation {
	const { Organisation: org } = update;
	return {
		contactRoleType: toContactRoleType(update.role),
		organisationId: update.organisationId,
		organisationName: org.name ?? null,
		organisationAddress: org.Address ? [mapAddress(org.Address)] : null,
		contacts: org.OrganisationToContact.map(({ Contact: c }) => ({
			contactId: c.id,
			contactPreference: toContactPreference(c.contactPreferenceId),
			writtenRepOrgName: c.orgName ?? null,
			writtenRepJobTitleorRole: c.jobTitleOrRole ?? null
		}))
	};
}

function formatProcedure(procedureId: CrownDevelopmentOdwPayload['procedureId']) {
	if (procedureId == null) {
		return null;
	}
	const procedure = APPLICATION_PROCEDURE.find((p) => p.id === procedureId);
	if (!procedure) {
		throw new Error(`Unknown procedureId: ${procedureId}`);
	}
	//TODO: Written representations (crown) vs Written Representations (ODW)
	// We should probably consider drift if we change the way things are displayed in the UI
	// This will mean that we have multiple versions in ODW unless we handle them
	if (procedure.id === APPLICATION_PROCEDURE_ID.WRITTEN_REPS) {
		return 'Written Representations';
	}
	return procedure.displayName;
}

// TODO: There is a mismatch between Address definitions in the schema.
//  This covers the required as defined in the applications-crowndev-application schema
//  But Address.schema asks for further info
//  NOTE: might be Schemas.CrownDevelopmentApplication['Address']
function mapAddress(address: AddressPayload): Schemas.Address {
	return {
		addressId: address.id,
		line1: address.line1,
		line2: address.line2,
		townCity: address.townCity,
		county: address.county,
		postcode: address.postcode
	};
}

function toContactRoleType(role: string): Schemas.Organisation['contactRoleType'] {
	if (role === ORGANISATION_ROLES_ID.AGENT || role === ORGANISATION_ROLES_ID.APPLICANT) {
		return role;
	}
	throw new Error(`Unknown organisation roleId: ${role}`);
}

function toContactPreference(id: string | null): Schemas.Contact['contactPreference'] {
	if (id === CONTACT_PREFERENCE_ID.EMAIL || id === CONTACT_PREFERENCE_ID.POST) {
		return id;
	}
	return null;
}
