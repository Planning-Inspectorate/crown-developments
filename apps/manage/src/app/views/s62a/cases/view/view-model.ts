import type { Prisma } from '@pins/crowndev-database/src/client/client.ts';
import { ORGANISATION_ROLES_ID } from '@pins/crowndev-database/src/seed/data-static.ts';
import {
	APPLICANT_TYPE_ID,
	CONTACT_ROLES_ID,
	SITE_AREA_UNIT_ID
} from '@pins/crowndev-database/src/seed/s62a/data-static.ts';
import { addressToViewModel } from '@pins/crowndev-lib/util/address.ts';
import type { YesNo } from '@pins/crowndev-lib/util/types.ts';
import { type Address, booleanToYesNoValue } from '@planning-inspectorate/dynamic-forms';
import type {
	AdditionalContactAnswer,
	AgentContactAnswer,
	ApplicantContactAnswer,
	ApplicantOrganisationAnswer
} from '../util/party-types.ts';
import type { S62A_VIEW_SELECT_INCLUDE } from './constants.ts';

export const S62A_DATE_FIELDS = Object.freeze([
	'notificationReceivedDate',
	'applicationReceivedDate',
	'applicationAcknowledgedDate',
	'furtherInformationRequestedDate',
	'agreedForAdditionalInformationDate',
	'applicationValidDate',
	'validLettersSentDate',
	'lpaQuestionnaireSentDate',
	'lpaQuestionnaireReceivedDate',
	'targetPublishDate',
	'publishDate',
	'pressNoticeDate',
	'neighboursNotifiedByLpaDate',
	'lpaInterestedPartiesDeadlineDate',
	'siteNoticeByLpaDate',
	'interestedPartiesPressNoticeDeadlineDate',
	'mineralApplicationsDate',
	'interimFindingsDate',
	's106SubmittedDate',
	'targetDecisionDate',
	'extendedTargetDecisionDate',
	'recoveredDate',
	'withdrawnDate',
	'turnedAwayDate',
	'environmentalStatementReceivedDate',
	'preApplicationReceivedDate',
	'preApplicationAdviceIssuedDate',
	'decisionDate',
	'recoveredReportSentDate'
] as const);

export const FEE_BOOLEAN_FIELDS = Object.freeze([
	'hasPreApplicationFee',
	'hasApplicationFee',
	'eligibleForFeeRefund'
] as const);
export const FEE_NUMBER_FIELDS = Object.freeze([
	'preApplicationFee',
	'applicationFee',
	'applicationFeeRefundAmount'
] as const);
export const FEE_STRING_FIELDS = Object.freeze(['customerNumber'] as const);
export const FEE_DATE_FIELDS = Object.freeze([
	'chargingScheduleSentDate',
	'invoiceDate',
	'preApplicationFeeReceivedDate',
	'applicationFeeReceivedDate',
	'applicationFeeRefundDate'
] as const);

export const CASE_TEAM_USER_RELATIONS = Object.freeze([
	{ field: 'assessorInspectorId', relation: 'AssessorInspector' },
	{ field: 'caseOfficerId', relation: 'CaseOfficer' },
	{ field: 'planningOfficerId', relation: 'PlanningOfficer' },
	{ field: 'readerId', relation: 'Reader' }
] as const);

export const EVENT_DATE_FIELDS = Object.freeze([
	'procedureNotificationDate',
	'hearingDate',
	'notificationDate',
	'additionalMeetingDate',
	'issuesReportingPublishedDate',
	'siteVisitDate'
] as const);

export const RESIDENTIAL_BOOLEAN_FIELDS = Object.freeze([
	'hasResidentialUnitsChange',
	'hasExistingHousing',
	'hasProposedHousing'
] as const);

export const EVENT_NUMBER_FIELDS = Object.freeze(['prepDuration', 'sittingDuration', 'reportingDuration'] as const);

export const EVENT_STRING_FIELDS = Object.freeze(['venue'] as const);

export interface CaseTeamInspectorItem {
	id: string;
	/// Entra ID of the inspector
	inspectorId?: string;
	inspectorAssignedDate?: Date;
	inspectorAppointedDate?: Date;
}

export type S62aCaseDbModel = Prisma.S62aCaseGetPayload<{
	include: typeof S62A_VIEW_SELECT_INCLUDE;
}>;

export interface WasteTypeItem {
	id: string;
	wasteTypeId?: string;
	voidCapacity?: number;
	voidCapacityUnitId?: string;
	maxAnnualThroughput?: number;
	maxAnnualThroughputUnitId?: string;
	/// Conditional radio amounts, keyed as `<unitFieldName>_<unitId>`
	[key: string]: unknown;
}

export interface S62aCaseViewModel {
	id: string;
	reference: string;
	developmentDescription: string;
	s62aStatusId?: string;
	typeId: string;
	applicationPhaseId?: string | null;
	classificationId?: string | null;
	lpaId: string | null;
	hasSecondaryLpa: YesNo;
	secondaryLpaId?: string | null;
	siteAddress?: Address;
	siteNorthing?: number | null;
	siteEasting?: number | null;
	siteAreaHectares?: number | null;
	siteAreaSquareMetres?: number | null;
	expectedSubmissionDate: Date;
	specialismId?: string | null;
	inspectorBandId?: string | null;
	subTypeId?: string | null;
	siteIsVisibleFromPublicLand?: YesNo;
	likelyIssues?: string | null;
	representationsPeriod?: {
		start?: Date;
		end?: Date;
	};
	representationsPublishDate?: Date;
	applicantType?: string | null;

	notificationReceivedDate?: Date;
	applicationReceivedDate?: Date;
	applicationAcknowledgedDate?: Date;
	furtherInformationRequestedDate?: Date;
	agreedForAdditionalInformationDate?: Date;
	applicationValidDate?: Date;
	validLettersSentDate?: Date;
	lpaQuestionnaireSentDate?: Date;
	lpaQuestionnaireReceivedDate?: Date;
	targetPublishDate?: Date;
	publishDate?: Date;
	pressNoticeDate?: Date;
	neighboursNotifiedByLpaDate?: Date;
	lpaInterestedPartiesDeadlineDate?: Date;
	siteNoticeByLpaDate?: Date;
	interestedPartiesPressNoticeDeadlineDate?: Date;
	mineralApplicationsDate?: Date;
	interimFindingsDate?: Date;
	s106SubmittedDate?: Date;
	targetDecisionDate?: Date;
	extendedTargetDecisionDate?: Date;
	recoveredDate?: Date;
	withdrawnDate?: Date;
	turnedAwayDate?: Date;
	reconsultationDetailsDate?: {
		start?: Date;
		end?: Date;
	};

	hasPreApplicationFee?: YesNo;
	preApplicationFee?: number;
	chargingScheduleSentDate?: Date;
	invoiceDate?: Date;
	preApplicationFeeReceivedDate?: Date;
	customerNumber?: string;

	hasApplicationFee?: YesNo;
	applicationFee?: number;
	applicationFeeReceivedDate?: Date;

	eligibleForFeeRefund?: YesNo;
	applicationFeeRefundAmount?: number;
	applicationFeeRefundDate?: Date;

	// Details tab
	stageId?: string | null;
	categoryId?: string | null;
	procedureId?: string | null;
	lpaReference?: string | null;
	listedBuildingReference?: string | null;
	healthAndSafetyIssue?: string | null;
	isGreenBelt?: YesNo;
	cilLiable?: YesNo;
	bngExempt?: YesNo;
	cilAmount?: number | null;
	updatedDate?: Date;
	createdDate?: Date;

	lpaFirstName?: string;
	lpaLastName?: string;
	lpaEmailAddress?: string;
	lpaPhoneNumber?: string;
	lpaAddress?: Address;

	secondaryLpaFirstName?: string;
	secondaryLpaLastName?: string;
	secondaryLpaEmailAddress?: string;
	secondaryLpaPhoneNumber?: string;
	secondaryLpaAddress?: Address;

	hasAgent?: YesNo;
	agentName?: string;
	agentAddress?: Address;
	agentRelationId?: string;
	agentOrganisationId?: string;
	agentOrganisationAddressId?: string;
	manageAgentContactDetails?: AgentContactAnswer[];

	manageApplicantOrganisations?: ApplicantOrganisationAnswer[];
	manageApplicantContactDetails?: ApplicantContactAnswer[];

	manageAdditionalContacts?: AdditionalContactAnswer[];

	// EIA tab
	eiaScreening?: YesNo;
	eiaScreeningOutcome?: YesNo;
	environmentalStatementReceivedDate?: Date;

	// Case Team tab
	assessorInspectorId?: string | null;
	caseOfficerId?: string | null;
	planningOfficerId?: string | null;
	readerId?: string | null;
	manageCaseTeamInspectors?: CaseTeamInspectorItem[];

	// Pre-Application tab
	preApplicationAdviceId?: string | null;
	preApplicationReference?: string | null;
	preApplicationReceivedDate?: Date;
	preApplicationAdviceIssuedDate?: Date;

	// Outcome tab
	outcomeTypeId?: string | null;
	decisionOutcomeId?: string | null;
	decisionDate?: Date;
	recoveredReportSentDate?: Date;

	// Event tab
	procedureNotificationDate?: Date;
	hearingDate?: Date;
	prepDuration?: number;
	sittingDuration?: number;
	reportingDuration?: number;
	venue?: string;
	notificationDate?: Date;
	additionalMeetingDate?: Date;
	issuesReportingPublishedDate?: Date;
	siteVisitDate?: Date;
	siteVisitTypeId?: string;

	// Waste tab
	wasteActivitiesDescription?: string | null;
	isWasteManagementDevelopment?: YesNo;
	manageWasteTypes?: WasteTypeItem[];

	//Press Notice tab
	pressNoticeCost?: number | null;
	pressNoticeReference?: string;
	pressNoticePlaced?: string;

	// Residential tab
	hasResidentialUnitsChange?: YesNo;
	hasExistingHousing?: YesNo;
	hasProposedHousing?: YesNo;
	manageExistingHousing?: unknown[];
	manageProposedHousing?: unknown[];
	totalNetGainOrLossOfUnits?: string;
}

/**
 * Optional boolean fields that need converting to YesNo | undefined
 */
const BOOLEAN_FIELDS = Object.freeze([
	'siteIsVisibleFromPublicLand',
	'isGreenBelt',
	'cilLiable',
	'bngExempt',
	'hasAgent',
	'eiaScreening',
	'eiaScreeningOutcome',
	'isWasteManagementDevelopment'
] as const);

/**
 * These integer fields are in the SaveModel as strings because they are in a multi-field input.
 * TODO update multi-field input to allow number fields CROWN-1620
 */
const INTEGER_STRING_FIELDS = Object.freeze(['siteNorthing', 'siteEasting'] as const);

/**
 * Fields that do not need mapping to (or from) the view model
 */
const DIRECT_UNMAPPED_FIELDS = Object.freeze([
	'likelyIssues',
	'representationsPublishDate',
	'lpaReference',
	'listedBuildingReference',
	'healthAndSafetyIssue',
	'preApplicationReference',
	'wasteActivitiesDescription',
	'pressNoticeReference',
	'pressNoticePlaced'
] as const);

/**
 * Audit date fields that map directly (read-only on the Details tab)
 */
const DATE_FIELDS = Object.freeze(['updatedDate', 'createdDate'] as const);

/**
 * Fields that represent foreign key relations in the database and are included in the view model
 * as simple ID fields for ease of use in the UI.
 */
const RELATION_ID_FIELDS = Object.freeze([
	's62aStatusId',
	'applicationPhaseId',
	'classificationId',
	'secondaryLpaId',
	'specialismId',
	'inspectorBandId',
	'subTypeId',
	'stageId',
	'categoryId',
	'procedureId',
	'preApplicationAdviceId',
	'outcomeTypeId',
	'decisionOutcomeId'
] as const);

// Create a union type of all valid dynamic fields
type DirectUnmappedField =
	| (typeof DIRECT_UNMAPPED_FIELDS)[number]
	| (typeof RELATION_ID_FIELDS)[number]
	| (typeof INTEGER_STRING_FIELDS)[number]
	| (typeof DATE_FIELDS)[number];

/**
 * Assign an S62aCase field that maps directly to the view model,
 * allowing null values from the database to be set as undefined in the view model.
 */
function assignNullableDirectField<K extends DirectUnmappedField>(
	viewModel: S62aCaseViewModel,
	dbCase: S62aCaseDbModel,
	field: K
) {
	const value = dbCase[field];
	viewModel[field] = (value === null ? undefined : value) as S62aCaseViewModel[K];
}

/**
 * Pure function to map a database record back to the frontend View Model.
 */
export function s62aCaseToViewModel(dbCase: S62aCaseDbModel): S62aCaseViewModel {
	const viewModel: S62aCaseViewModel = {
		id: dbCase.id,
		reference: dbCase.reference,
		developmentDescription: dbCase.description,
		typeId: dbCase.typeId,
		lpaId: dbCase.lpaId,
		hasSecondaryLpa: booleanToYesNoValue(dbCase.hasSecondaryLpa),
		expectedSubmissionDate: dbCase.expectedSubmissionDate,
		applicantType: dbCase.applicantTypeId
	};

	for (const field of BOOLEAN_FIELDS) {
		viewModel[field] = typeof dbCase[field] === 'boolean' ? booleanToYesNoValue(dbCase[field]) : undefined;
	}

	for (const field of [...RELATION_ID_FIELDS, ...DIRECT_UNMAPPED_FIELDS, ...INTEGER_STRING_FIELDS, ...DATE_FIELDS]) {
		assignNullableDirectField(viewModel, dbCase, field);
	}

	if (dbCase.representationsPeriodStartDate || dbCase.representationsPeriodEndDate) {
		viewModel.representationsPeriod = {};

		if (dbCase.representationsPeriodStartDate) {
			viewModel.representationsPeriod.start = dbCase.representationsPeriodStartDate;
		}
		if (dbCase.representationsPeriodEndDate) {
			viewModel.representationsPeriod.end = dbCase.representationsPeriodEndDate;
		}
	}

	if (dbCase.siteAreaInSquareMetres) {
		if (dbCase.siteAreaOriginalUnitId === SITE_AREA_UNIT_ID.METRES_SQUARED) {
			viewModel.siteAreaSquareMetres = dbCase.siteAreaInSquareMetres.toNumber();
		} else {
			viewModel.siteAreaHectares = Number(dbCase.siteAreaInSquareMetres.dividedBy(10000).toFixed(4));
		}
	}

	if (dbCase.cilAmount) {
		viewModel.cilAmount = dbCase.cilAmount.toNumber();
	}

	if (dbCase.SiteAddress) {
		viewModel.siteAddress = addressToViewModel(dbCase.SiteAddress);
	}

	if (dbCase.S62aDates) {
		for (const field of S62A_DATE_FIELDS) {
			const dateValue = dbCase.S62aDates[field];
			if (dateValue) {
				viewModel[field] = dateValue;
			}
		}

		if (dbCase.S62aDates.reconsultationDetailsSentDate || dbCase.S62aDates.reconsultationDetailsDeadlineDate) {
			viewModel.reconsultationDetailsDate = {};

			if (dbCase.S62aDates.reconsultationDetailsSentDate) {
				viewModel.reconsultationDetailsDate.start = dbCase.S62aDates.reconsultationDetailsSentDate;
			}
			if (dbCase.S62aDates.reconsultationDetailsDeadlineDate) {
				viewModel.reconsultationDetailsDate.end = dbCase.S62aDates.reconsultationDetailsDeadlineDate;
			}
		}
	}

	if (dbCase.S62aFees) {
		for (const field of FEE_BOOLEAN_FIELDS) {
			const val = dbCase.S62aFees[field];
			if (typeof val === 'boolean') {
				viewModel[field] = booleanToYesNoValue(val);
			}
		}

		for (const field of FEE_NUMBER_FIELDS) {
			const val = dbCase.S62aFees[field];
			if (val) {
				viewModel[field] = val.toNumber();
			}
		}

		for (const field of FEE_DATE_FIELDS) {
			const val = dbCase.S62aFees[field];
			if (val) {
				viewModel[field] = val;
			}
		}

		for (const field of FEE_STRING_FIELDS) {
			const val = dbCase.S62aFees[field];
			if (val) {
				viewModel[field] = val;
			}
		}
	}

	if (dbCase.S62aEvent) {
		for (const field of EVENT_DATE_FIELDS) {
			const val = dbCase.S62aEvent[field];
			if (val) {
				viewModel[field] = val;
			}
		}

		for (const field of EVENT_NUMBER_FIELDS) {
			const val = dbCase.S62aEvent[field];
			if (val) {
				viewModel[field] = val.toNumber();
			}
		}

		for (const field of EVENT_STRING_FIELDS) {
			const val = dbCase.S62aEvent[field];
			if (val) {
				viewModel[field] = val;
			}
		}

		if (dbCase.S62aEvent.siteVisitTypeId) {
			viewModel.siteVisitTypeId = dbCase.S62aEvent.siteVisitTypeId;
		}
	}

	if (dbCase.S62aResidential) {
		for (const field of RESIDENTIAL_BOOLEAN_FIELDS) {
			const val = dbCase.S62aResidential[field];
			if (val !== null && val !== undefined) {
				viewModel[field] = booleanToYesNoValue(val);
			}
		}
	}

	if (dbCase.Lpa) {
		viewModel.lpaAddress = addressToViewModel(dbCase.Lpa.Address);
	}

	if (dbCase.SecondaryLpa) {
		viewModel.secondaryLpaAddress = addressToViewModel(dbCase.SecondaryLpa.Address);
	}

	if (dbCase.LpaContact) {
		viewModel.lpaFirstName = dbCase.LpaContact.firstName || undefined;
		viewModel.lpaLastName = dbCase.LpaContact.lastName || undefined;
		viewModel.lpaEmailAddress = dbCase.LpaContact.email || undefined;
		viewModel.lpaPhoneNumber = dbCase.LpaContact.telephoneNumber || undefined;
	}

	if (dbCase.SecondaryLpaContact) {
		viewModel.secondaryLpaFirstName = dbCase.SecondaryLpaContact.firstName || undefined;
		viewModel.secondaryLpaLastName = dbCase.SecondaryLpaContact.lastName || undefined;
		viewModel.secondaryLpaEmailAddress = dbCase.SecondaryLpaContact.email || undefined;
		viewModel.secondaryLpaPhoneNumber = dbCase.SecondaryLpaContact.telephoneNumber || undefined;
	}

	if (dbCase.pressNoticeCost) {
		viewModel.pressNoticeCost = dbCase.pressNoticeCost.toNumber();
	}

	if (dbCase.S62aToApplicants && dbCase.S62aToApplicants.length > 0) {
		const agentRecords = dbCase.S62aToApplicants.filter((x) => x.roleId === ORGANISATION_ROLES_ID.AGENT);
		const applicantRecords = dbCase.S62aToApplicants.filter((x) => x.roleId === ORGANISATION_ROLES_ID.APPLICANT);

		// Anything that is not agent or applicant must be "additional" for s62a
		const additionalContactRecords = dbCase.S62aToApplicants.filter(
			(join) => join.roleId !== ORGANISATION_ROLES_ID.AGENT && join.roleId !== ORGANISATION_ROLES_ID.APPLICANT
		);

		if (agentRecords.length > 0) {
			const agentRecord = agentRecords[0];
			viewModel.agentRelationId = agentRecord.id;

			const agentOrg = agentRecord.Organisation;
			if (agentOrg) {
				viewModel.agentOrganisationId = agentOrg.id;
				viewModel.agentName = agentOrg.name;

				if (agentOrg.Address) {
					viewModel.agentOrganisationAddressId = agentOrg.addressId ?? agentOrg.Address.id;
					viewModel.agentAddress = addressToViewModel(agentOrg.Address);
				}

				if (agentOrg.OrganisationToContact && agentOrg.OrganisationToContact.length > 0) {
					viewModel.manageAgentContactDetails = agentOrg.OrganisationToContact.map((otc) => ({
						id: otc.Contact.id,
						organisationToContactRelationId: otc.id,
						agentFirstName: otc.Contact.firstName || undefined,
						agentLastName: otc.Contact.lastName || undefined,
						agentContactEmail: otc.Contact.email || undefined,
						agentContactTelephoneNumber: otc.Contact.telephoneNumber || undefined
					}));
				}
			}
		}

		if (applicantRecords.length > 0) {
			const isOrganisation = dbCase.applicantTypeId === APPLICANT_TYPE_ID.ORGANISATION;

			if (isOrganisation) {
				viewModel.manageApplicantOrganisations = [];
				viewModel.manageApplicantContactDetails = [];

				for (const app of applicantRecords) {
					if (app.Organisation) {
						viewModel.manageApplicantOrganisations.push({
							id: app.Organisation.id,
							organisationRelationId: app.id,
							organisationName: app.Organisation.name,
							organisationAddressId: app.Organisation.addressId ?? app.Organisation.Address?.id,
							organisationAddress: app.Organisation.Address ? addressToViewModel(app.Organisation.Address) : undefined
						});

						if (app.Organisation.OrganisationToContact) {
							for (const otc of app.Organisation.OrganisationToContact) {
								viewModel.manageApplicantContactDetails.push({
									id: otc.Contact.id,
									organisationToContactRelationId: otc.id,
									applicantFirstName: otc.Contact.firstName || undefined,
									applicantLastName: otc.Contact.lastName || undefined,
									applicantContactEmail: otc.Contact.email || undefined,
									applicantContactTelephoneNumber: otc.Contact.telephoneNumber || undefined,
									applicantContactOrganisation: app.Organisation.id
								});
							}
						}
					}
				}
			} else {
				viewModel.manageApplicantContactDetails = [];

				for (const app of applicantRecords) {
					if (app.Contact) {
						viewModel.manageApplicantContactDetails.push({
							id: app.Contact.id,
							applicantRelationId: app.id,
							applicantFirstName: app.Contact.firstName || undefined,
							applicantLastName: app.Contact.lastName || undefined,
							applicantContactEmail: app.Contact.email || undefined,
							applicantContactTelephoneNumber: app.Contact.telephoneNumber || undefined
						});
					}
				}
			}
		}

		if (additionalContactRecords.length > 0) {
			viewModel.manageAdditionalContacts = [];

			for (const ac of additionalContactRecords) {
				const isOtherType = ac.roleId !== CONTACT_ROLES_ID.INTERESTED_PARTY;
				const typeValue = isOtherType ? 'other' : ac.roleId;
				const otherTypeValue = isOtherType ? ac.Role.displayName : undefined;

				if (ac.Contact) {
					viewModel.manageAdditionalContacts.push({
						id: ac.Contact.id,
						additionalContactRelationId: ac.id,
						additionalContactType: typeValue,
						otherContactType: otherTypeValue || undefined,
						additionalContactType_otherContactType: otherTypeValue || undefined,
						firstName: ac.Contact.firstName || undefined,
						lastName: ac.Contact.lastName || undefined,
						organisationName: ac.Contact.orgName || undefined,
						emailAddress: ac.Contact.email || undefined,
						phoneNumber: ac.Contact.telephoneNumber || undefined,
						additionalContactAddress: ac.Contact.Address ? addressToViewModel(ac.Contact.Address) : undefined
					});
				}
			}
		}
	}

	for (const { field, relation } of CASE_TEAM_USER_RELATIONS) {
		viewModel[field] = dbCase[relation]?.idpUserId ?? undefined;
	}

	if (dbCase.Inspectors && dbCase.Inspectors.length > 0) {
		viewModel.manageCaseTeamInspectors = (dbCase.Inspectors ?? []).map((inspector) => ({
			id: inspector.id,
			inspectorId: inspector.User.idpUserId ?? undefined,
			inspectorAssignedDate: inspector.assignedDate ?? undefined,
			inspectorAppointedDate: inspector.appointedDate ?? undefined
		}));
	}

	viewModel.manageWasteTypes = (dbCase.WasteTypes ?? []).map((wt) => ({
		id: wt.id,
		wasteTypeId: wt.wasteTypeId,
		voidCapacity: wt.voidCapacity?.toNumber(),
		voidCapacityUnitId: wt.voidCapacityUnitId ?? undefined,
		maxAnnualThroughput: wt.maxAnnualThroughput?.toNumber(),
		maxAnnualThroughputUnitId: wt.maxAnnualThroughputUnitId ?? undefined,
		// The conditional radio stores each unit's amount under its own key, so the
		// right input pre-fills on edit and the summary can find the value.
		...(wt.voidCapacityUnitId && wt.voidCapacity
			? { [`voidCapacityUnitId_${wt.voidCapacityUnitId}`]: String(wt.voidCapacity.toNumber()) }
			: {}),
		...(wt.maxAnnualThroughputUnitId && wt.maxAnnualThroughput
			? { [`maxAnnualThroughputUnitId_${wt.maxAnnualThroughputUnitId}`]: String(wt.maxAnnualThroughput.toNumber()) }
			: {})
	}));

	return viewModel;
}
