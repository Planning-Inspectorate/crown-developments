import {
	APPLICATION_PROCEDURE_ID,
	APPLICATION_STAGE_ID,
	ORGANISATION_ROLES_ID
} from '@pins/crowndev-database/src/seed/data-static.ts';
import { toFloat, toInt, parseNumberStringToNumber } from '@pins/crowndev-lib/util/numbers.ts';
import { booleanToYesNoValue } from '@planning-inspectorate/dynamic-forms';
import { optionalWhere } from '@pins/crowndev-lib/util/database.js';
import { addressToViewModel, viewModelToAddressUpdateInput } from '@pins/crowndev-lib/util/address.ts';
import {
	buildAgentOrganisationNameUpdates,
	buildAgentOrganisationAddressUpdates,
	viewModelToNestedContactUpdate,
	buildApplicantOrganisationUpdates,
	buildApplicantContactOrganisationUpdates,
	buildAgentContactOrganisationUpdates
} from './linked-case-updates.ts';
import type { Address } from '@planning-inspectorate/dynamic-forms';
import type { YesNo } from '@pins/crowndev-lib/util/types.ts';
import type { Prisma } from '@pins/crowndev-database/src/client/client.ts';
import type { ApplicantContact, AgentContact } from '../create-a-case/types.d.ts';

type ProcedurePrefix = 'inquiry' | 'hearing' | 'writtenReps';
type ProcedureId = (typeof APPLICATION_PROCEDURE_ID)[keyof typeof APPLICATION_PROCEDURE_ID];

export interface CrownDevelopmentViewModel {
	reference: string;
	description: string;
	containsDistressingContent: YesNo;
	typeId: string;
	subTypeId?: string;
	lpaId: string;
	hasSecondaryLpa: YesNo;
	secondaryLpaId?: string;
	siteAddressId?: string;
	siteAddress?: Address;
	siteNorthing?: number;
	siteEasting?: number;
	siteArea?: number;
	expectedDateOfSubmission: Date;
	decisionOutcomeId?: string;
	decisionDate?: Date;

	updatedDate: Date;
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
	// TODO Remove in CROWN-1509
	applicantContactId?: string;
	applicantContactName?: string;
	applicantContactAddress?: Address;
	applicantContactAddressId?: string;
	applicantContactEmail?: string;
	applicantContactTelephoneNumber?: string;
	// TODO Remove in CROWN-1509
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
	lpaQuestionnaireSpecialEmailSent?: YesNo;
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
	hearingVenue?: string;
	hearingNotificationDate?: Date;
	hearingIssuesReportPublishedDate?: Date;
	// Only used if sub-fields not set
	hearingDuration?: string;
	hearingDurationPrep?: number;
	hearingDurationSitting?: number;
	hearingDurationReporting?: number;

	inquiryProcedureNotificationDate?: Date;
	inquiryStatementsDate?: Date;
	inquiryDate?: Date;
	inquiryVenue?: string;
	inquiryNotificationDate?: Date;
	inquiryCaseManagementConferenceDate?: Date;
	inquiryPreMeetingDate?: Date;
	inquiryProofsOfEvidenceDate?: Date;
	// Only used if sub-fields not set
	inquiryDuration?: string;
	inquiryDurationPrep?: number;
	inquiryDurationSitting?: number;
	inquiryDurationReporting?: number;

	connectedApplication?: string;

	hasApplicationFee?: YesNo;
	applicationFee?: number;
	applicationFeeReceivedDate?: Date;
	eligibleForFeeRefund?: YesNo;
	applicationFeeRefundAmount?: number;
	applicationFeeRefundDate?: Date;
	cilLiable?: YesNo;
	cilAmount?: number;
	bngExempt?: YesNo;
	hasCostsApplications?: YesNo;
	costsApplicationsComment?: string;
	siteVisitDate?: Date;
}

/**
 * Map the view model to the answer model.
 * In the answer model:
 * - boolean fields must be true booleans (as set in dynamic-forms)
 * - number fields must be strings (as they come from the form inputs)
 * - all fields are optional and can be included in the edits object when they are edited, but do not need to be included if they are not edited
 */
export type CrownDevelopmentSaveModel = Partial<{
	[K in keyof CrownDevelopmentViewModel]: NonNullable<CrownDevelopmentViewModel[K]> extends YesNo
		? boolean | (undefined extends CrownDevelopmentViewModel[K] ? undefined : never)
		: NonNullable<CrownDevelopmentViewModel[K]> extends number
			? string | (undefined extends CrownDevelopmentViewModel[K] ? undefined : never)
			: CrownDevelopmentViewModel[K];
}>;

export interface ManageApplicantDetails {
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

export type CrownDevelopmentViewModelFields = keyof CrownDevelopmentViewModel;

type BooleanMappedViewModelFields = {
	[K in CrownDevelopmentViewModelFields]: NonNullable<CrownDevelopmentViewModel[K]> extends YesNo ? K : never;
}[CrownDevelopmentViewModelFields];

type DirectMappedViewModelFields = Exclude<CrownDevelopmentViewModelFields, BooleanMappedViewModelFields>;

type DecimalMappedViewModelFields = (typeof DECIMAL_FIELDS)[number];

type NullableDirectMappedViewModelFields = Exclude<DirectMappedViewModelFields, DecimalMappedViewModelFields>;

/**
 * Fields that are included in the view model but should not be updatable when
 * mapping edits back to the database, because they are system-generated.
 */
const NON_UPDATABLE_FIELDS = Object.freeze(['reference', 'updatedDate', 'SubType'] as const);

/**
 * Fields that are not optional in the database and must be included in the view model.
 */
const REQUIRED_FIELDS = Object.freeze([
	'reference',
	'description',
	'containsDistressingContent',
	'hasSecondaryLpa',
	'expectedDateOfSubmission',
	'updatedDate',
	'hasAgent'
] as const satisfies Readonly<CrownDevelopmentViewModelFields[]>);

type BooleanPayloadField = BooleanMappedViewModelFields & keyof CrownDevelopmentPayload;

type NullableBooleanPayloadField = {
	[K in BooleanPayloadField]: undefined extends CrownDevelopmentViewModel[K] ? K : never;
}[BooleanPayloadField];

/**
 * Fields that need standard mapping from boolean in the database to YesNo in the view model.
 */
const BOOLEAN_FIELDS = Object.freeze([
	'nationallyImportant',
	'isGreenBelt',
	'siteIsVisibleFromPublicLand',
	'eiaScreening',
	'eiaScreeningOutcome',
	'lpaQuestionnaireReceivedEmailSent',
	'lpaQuestionnaireSpecialEmailSent',
	'hasApplicationFee',
	'eligibleForFeeRefund',
	'applicationReceivedDateEmailSent',
	'notNationallyImportantEmailSent',
	'cilLiable',
	'bngExempt',
	'hasCostsApplications',
	'environmentalImpactAssessment',
	'developmentPlan',
	'rightOfWay'
] as const satisfies ReadonlyArray<NullableBooleanPayloadField>);

/**
 * Fields that need standard mapping from Prisma's Decimal.js type in the database to float in the view model.
 */
const DECIMAL_FIELDS = Object.freeze([
	'siteArea',
	'applicationFee',
	'applicationFeeRefundAmount',
	'cilAmount'
] as const);

/**
 * Fields that do not need mapping to (or from) the view model
 */
const DIRECT_UNMAPPED_FIELDS = Object.freeze([
	'siteNorthing',
	'siteEasting',
	'lpaReference',
	'nationallyImportantConfirmationDate',
	'healthAndSafetyIssue',
	'applicationReceivedDate',
	'applicationAcceptedDate',
	'lpaQuestionnaireSentDate',
	'lpaQuestionnaireReceivedDate',
	'publishDate',
	'pressNoticeDate',
	'neighboursNotifiedByLpaDate',
	'siteNoticeByLpaDate',
	'targetDecisionDate',
	'extendedTargetDecisionDate',
	'recoveredDate',
	'recoveredReportSentDate',
	'withdrawnDate',
	'decisionDate',
	'originalDecisionDate',
	'turnedAwayDate',
	'representationsPublishDate',
	// These are Entra IDs, not foreign keys
	'inspector1Id',
	'inspector2Id',
	'inspector3Id',
	'assessorInspectorId',
	'caseOfficerId',
	'planningOfficerId',
	'environmentalStatementReceivedDate',
	'applicationFeeReceivedDate',
	'applicationFeeRefundDate',
	'siteVisitDate',
	'costsApplicationsComment'
] as const satisfies Readonly<NullableDirectMappedViewModelFields[]>);

/**
 * Fields that represent foreign key relations in the database and are included in the view model
 * as simple ID fields for ease of use in the UI.
 */
const RELATION_ID_FIELDS = Object.freeze([
	'subTypeId',
	'secondaryLpaId',
	'decisionOutcomeId',
	'procedureId',
	'stageId',
	'statusId',
	'siteAddressId',
	// TODO Remove in CROWN-1509
	'applicantContactId',
	// TODO Remove in CROWN-1509
	'agentContactId',
	'eventId'
] as const satisfies Readonly<NullableDirectMappedViewModelFields[]>);

type DirectUnmappedField = (typeof DIRECT_UNMAPPED_FIELDS)[number] | (typeof RELATION_ID_FIELDS)[number];

/**
 * Field prefixes used for the contact fields in the view model
 */
const CONTACT_PREFIXES = ORGANISATION_ROLES_ID;

type ContactTypeKeys = keyof typeof CONTACT_PREFIXES;
export type ContactTypeValues = (typeof CONTACT_PREFIXES)[ContactTypeKeys];

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

/**
 * Assign a CrownDevelopment field that maps directly to the view model,
 * allowing null values from the database to be set as undefined in the view model.
 */
function assignNullableDirectField<K extends DirectUnmappedField>(
	viewModel: CrownDevelopmentViewModel,
	crownDevelopment: CrownDevelopmentPayload,
	field: K
) {
	const value = crownDevelopment[field];
	viewModel[field] = (value === null ? undefined : value) as CrownDevelopmentViewModel[K];
}

/**
 * Converts a CrownDevelopment database record to the view model format used for rendering and editing cases in the UI.
 */
export function crownDevelopmentToViewModel(crownDevelopment: CrownDevelopmentPayload): CrownDevelopmentViewModel {
	// Set required properties
	const viewModel: CrownDevelopmentViewModel = {
		reference: crownDevelopment.reference,
		description: crownDevelopment.description,
		containsDistressingContent: booleanToYesNoValue(crownDevelopment.containsDistressingContent),
		typeId: crownDevelopment.typeId,
		lpaId: crownDevelopment.lpaId,
		hasSecondaryLpa: booleanToYesNoValue(crownDevelopment.hasSecondaryLpa),
		expectedDateOfSubmission: crownDevelopment.expectedDateOfSubmission,
		updatedDate: crownDevelopment.updatedDate ?? crownDevelopment.createdDate,
		hasAgent: booleanToYesNoValue(crownDevelopment.hasAgent)
	};

	// Allow non-required booleans to be undefined in the view model if they are null in the database, to avoid marking them as answered in the UI when they are actually unanswered.
	for (const field of BOOLEAN_FIELDS) {
		viewModel[field] =
			typeof crownDevelopment[field] === 'boolean' ? booleanToYesNoValue(crownDevelopment[field]) : undefined;
	}

	// Directly assign fields that have the same type in the database and view model
	for (const field of [...RELATION_ID_FIELDS, ...DIRECT_UNMAPPED_FIELDS]) {
		assignNullableDirectField(viewModel, crownDevelopment, field);
	}

	if (crownDevelopment.representationsPeriodStartDate || crownDevelopment.representationsPeriodEndDate) {
		viewModel.representationsPeriod = {
			start: crownDevelopment.representationsPeriodStartDate ?? undefined,
			end: crownDevelopment.representationsPeriodEndDate ?? undefined
		};
	}

	// Convert Prisma's Decimal.js numbers to regular numbers for the view model.
	viewModel.siteArea = crownDevelopment.siteArea?.toNumber();
	viewModel.applicationFee = crownDevelopment.applicationFee?.toNumber();
	viewModel.applicationFeeRefundAmount = crownDevelopment.applicationFeeRefundAmount?.toNumber();
	viewModel.cilAmount = crownDevelopment.cilAmount?.toNumber();

	if (crownDevelopment.SiteAddress) {
		viewModel.siteAddress = addressToViewModel(crownDevelopment.SiteAddress);
	}

	if (crownDevelopment.Category) {
		viewModel.subCategoryId = crownDevelopment.Category.id;
	}

	if (
		crownDevelopment.ParentCrownDevelopment ||
		(crownDevelopment.ChildrenCrownDevelopment && crownDevelopment.ChildrenCrownDevelopment.length > 0)
	) {
		const childrenReferences = (crownDevelopment.ChildrenCrownDevelopment ?? []).map((child) => child.reference);

		viewModel.connectedApplication =
			crownDevelopment.ParentCrownDevelopment?.reference ?? childrenReferences.join(', ');
	}

	if (crownDevelopment.Organisations) {
		// There will be a maximum of one agent organisation linked to a case.
		const agentOrganisationRelationship = crownDevelopment.Organisations.find(
			(crownToOrganisation) => crownToOrganisation.role === ORGANISATION_ROLES_ID.AGENT
		);
		viewModel.agentOrganisationName = agentOrganisationRelationship?.Organisation?.name;
		viewModel.agentOrganisationId = agentOrganisationRelationship?.Organisation?.id;
		viewModel.agentOrganisationRelationId = agentOrganisationRelationship?.id;
		// Needed for address upserts when editing the agent organisation address.
		viewModel.agentOrganisationAddressId =
			agentOrganisationRelationship?.Organisation?.addressId ??
			agentOrganisationRelationship?.Organisation?.Address?.id;
		viewModel.agentOrganisationAddress = agentOrganisationRelationship?.Organisation?.Address
			? addressToViewModel(agentOrganisationRelationship.Organisation.Address)
			: undefined;

		viewModel.manageAgentContactDetails = agentOrganisationRelationship?.Organisation?.OrganisationToContact?.map(
			(orgToContact) => ({
				id: orgToContact.Contact.id,
				organisationToContactRelationId: orgToContact.id,
				agentFirstName: orgToContact.Contact.firstName ?? '',
				agentLastName: orgToContact.Contact.lastName ?? '',
				agentContactEmail: orgToContact.Contact.email ?? '',
				agentContactTelephoneNumber: orgToContact.Contact.telephoneNumber ?? ''
			})
		);

		viewModel.manageApplicantDetails = crownDevelopment.Organisations.filter(
			(crownToOrganisation) => crownToOrganisation.role === ORGANISATION_ROLES_ID.APPLICANT
		).map((crownToOrganisation) => {
			return {
				id: crownToOrganisation.Organisation.id,
				organisationName: crownToOrganisation.Organisation.name,
				organisationAddress: addressToViewModel(crownToOrganisation.Organisation.Address) || {},
				organisationRelationId: crownToOrganisation.id,
				organisationAddressId: crownToOrganisation.Organisation.addressId ?? undefined
			};
		});

		viewModel.manageApplicantContactDetails = crownDevelopment.Organisations.filter(
			(crownToOrganisation) => crownToOrganisation.role === ORGANISATION_ROLES_ID.APPLICANT
		).flatMap((crownToOrganisation) =>
			(crownToOrganisation.Organisation.OrganisationToContact ?? []).map((orgToContact) => ({
				// This ID is used for the session. However, it should be fine to use the
				// database-generated contact ID here.
				id: orgToContact.Contact.id,
				// Used for updating existing contacts, as the relation ID is needed to
				// target the correct relation record for updates. If this is not present,
				// the update will assume it's a new contact and attempt to create it instead.
				organisationToContactRelationId: orgToContact.id,
				applicantFirstName: orgToContact.Contact.firstName ?? '',
				applicantLastName: orgToContact.Contact.lastName ?? '',
				applicantContactEmail: orgToContact.Contact.email ?? '',
				applicantContactTelephoneNumber: orgToContact.Contact.telephoneNumber ?? '',
				applicantContactOrganisation: crownToOrganisation.organisationId
			}))
		);
	}

	addLpaDetailsToViewModel(viewModel, crownDevelopment.Lpa);

	if (crownDevelopment.hasSecondaryLpa === true) {
		addLpaDetailsToViewModel(viewModel, crownDevelopment.SecondaryLpa, 'secondaryLpa');
	}

	addContactToViewModel(viewModel, crownDevelopment.ApplicantContact, 'applicant');
	addContactToViewModel(viewModel, crownDevelopment.AgentContact, 'agent');
	if (hasProcedure(crownDevelopment.procedureId)) {
		addEventToViewModel(
			viewModel,
			crownDevelopment.Event,
			crownDevelopment.procedureId,
			crownDevelopment.procedureNotificationDate
		);
	}
	return viewModel;
}

/**
 * Convert Decimal database fields to floats in view model.
 */
function assignDecimalUpdates(edits: CrownDevelopmentSaveModel, updates: Prisma.CrownDevelopmentUpdateInput) {
	for (const field of DECIMAL_FIELDS) {
		if (Object.hasOwn(edits, field) && edits[field] !== undefined) {
			updates[field] = toFloat(edits[field]);
		}
	}
}

type DirectUpdateField = keyof CrownDevelopmentSaveModel & keyof Prisma.CrownDevelopmentUpdateInput;

const DIRECT_UPDATE_FIELDS: ReadonlyArray<DirectUpdateField> = Object.freeze([
	...REQUIRED_FIELDS,
	...BOOLEAN_FIELDS,
	...DIRECT_UNMAPPED_FIELDS
]);

function assignDirectUpdate<K extends DirectUpdateField>(
	updates: Prisma.CrownDevelopmentUpdateInput,
	edits: CrownDevelopmentSaveModel,
	field: K
) {
	if (Object.hasOwn(edits, field)) {
		updates[field] = edits[field];
	}
}

/**
 * Answers/edits are received in 'view-model' form, and are mapped here to the appropriate database input.
 *
 * @param edits - edited fields only
 * @param viewModel - full view model with all case details
 * @param options
 * @param options.includeOrganisations - default true
 */
export function editsToDatabaseUpdates(
	edits: CrownDevelopmentSaveModel,
	viewModel: CrownDevelopmentViewModel,
	options: { includeOrganisations?: boolean } = {}
): Prisma.CrownDevelopmentUpdateInput {
	const includeOrganisations = options?.includeOrganisations !== false;

	const crownDevelopmentUpdateInput: Prisma.CrownDevelopmentUpdateInput = {};

	// map all the regular fields to the update input
	// Boolean fields do not need to be converted from YesNo here since they are already true booleans in the edits
	for (const field of DIRECT_UPDATE_FIELDS) {
		assignDirectUpdate(crownDevelopmentUpdateInput, edits, field);
	}

	// don't support updating these fields
	NON_UPDATABLE_FIELDS.forEach((field) => {
		delete crownDevelopmentUpdateInput[field];
	});

	// set number fields
	if ('siteNorthing' in edits || 'siteEasting' in edits) {
		crownDevelopmentUpdateInput.siteNorthing = edits.siteNorthing ? toInt(edits.siteNorthing) : null;
		crownDevelopmentUpdateInput.siteEasting = edits.siteEasting ? toInt(edits.siteEasting) : null;
	}

	assignDecimalUpdates(edits, crownDevelopmentUpdateInput);

	if (edits.representationsPeriod) {
		crownDevelopmentUpdateInput.representationsPeriodStartDate = edits.representationsPeriod.start;
		crownDevelopmentUpdateInput.representationsPeriodEndDate = edits.representationsPeriod.end;
	}

	// update relations

	// Required foreign key scalar fields need to be mapped to relations for a consistent return type.
	if ('typeId' in edits && edits.typeId) {
		crownDevelopmentUpdateInput.Type = { connect: { id: edits.typeId } };
	}
	if ('lpaId' in edits && edits.lpaId) {
		crownDevelopmentUpdateInput.Lpa = { connect: { id: edits.lpaId } };
	}

	// Optional foreign key scalar fields need to be mapped to relations for a consistent return type.
	if ('decisionOutcomeId' in edits) {
		crownDevelopmentUpdateInput.DecisionOutcome = edits.decisionOutcomeId
			? { connect: { id: edits.decisionOutcomeId } }
			: { disconnect: true };
	}
	if ('statusId' in edits) {
		crownDevelopmentUpdateInput.Status = edits.statusId ? { connect: { id: edits.statusId } } : { disconnect: true };
	}
	// stageId edited directly (may be overridden below by procedure block)
	if ('stageId' in edits) {
		crownDevelopmentUpdateInput.Stage = edits.stageId ? { connect: { id: edits.stageId } } : { disconnect: true };
	}
	if ('secondaryLpaId' in edits && edits.secondaryLpaId) {
		crownDevelopmentUpdateInput.SecondaryLpa = { connect: { id: edits.secondaryLpaId } };
	}
	// TODO Remove in CROWN-1509
	if ('applicantContactId' in edits) {
		crownDevelopmentUpdateInput.ApplicantContact = edits.applicantContactId
			? { connect: { id: edits.applicantContactId } }
			: { disconnect: true };
	}
	// TODO Remove in CROWN-1509
	if ('agentContactId' in edits) {
		crownDevelopmentUpdateInput.AgentContact = edits.agentContactId
			? { connect: { id: edits.agentContactId } }
			: { disconnect: true };
	}

	if (edits.subCategoryId) {
		crownDevelopmentUpdateInput.Category = {
			connect: { id: edits.subCategoryId }
		};
	}

	if ('siteAddress' in edits && edits.siteAddress) {
		const siteAddress = viewModelToAddressUpdateInput(edits.siteAddress);
		if (siteAddress) {
			crownDevelopmentUpdateInput.SiteAddress = {
				upsert: {
					where: optionalWhere(viewModel.siteAddressId),
					create: siteAddress,
					update: siteAddress
				}
			};
		}
	}

	// TODO Remove in CROWN-1509
	const applicantContactUpdates = viewModelToNestedContactUpdate(edits, CONTACT_PREFIXES.APPLICANT, viewModel);
	if (applicantContactUpdates) {
		crownDevelopmentUpdateInput.ApplicantContact = applicantContactUpdates;
	}
	// TODO Remove in CROWN-1509
	const agentContactUpdates = viewModelToNestedContactUpdate(edits, CONTACT_PREFIXES.AGENT, viewModel);
	if (agentContactUpdates) {
		crownDevelopmentUpdateInput.AgentContact = agentContactUpdates;
	}

	if (includeOrganisations) {
		if ('manageApplicantDetails' in edits) {
			crownDevelopmentUpdateInput.Organisations = buildApplicantOrganisationUpdates(edits, viewModel);
		}

		// Applicant contacts linked to organisations
		if ('manageApplicantContactDetails' in edits) {
			crownDevelopmentUpdateInput.Organisations = buildApplicantContactOrganisationUpdates(edits, viewModel);
		}

		// Agent contacts linked to organisations
		if ('manageAgentContactDetails' in edits) {
			crownDevelopmentUpdateInput.Organisations = buildAgentContactOrganisationUpdates(edits, viewModel);
		}

		const agentOrganisationNameUpdates = buildAgentOrganisationNameUpdates(edits, viewModel);
		if (agentOrganisationNameUpdates) {
			crownDevelopmentUpdateInput.Organisations = agentOrganisationNameUpdates;
		}

		const agentOrganisationAddressUpdates = buildAgentOrganisationAddressUpdates(edits, viewModel);
		if (agentOrganisationAddressUpdates) {
			crownDevelopmentUpdateInput.Organisations = agentOrganisationAddressUpdates;
		}
	}

	if ('procedureId' in edits && edits.procedureId !== viewModel.procedureId) {
		if (edits.procedureId) {
			crownDevelopmentUpdateInput.Procedure = {
				connect: { id: edits.procedureId }
			};
			if (stageIsProcedure(viewModel.stageId)) {
				// If the current stage is a procedure, update it to match the new procedure
				crownDevelopmentUpdateInput.Stage = {
					connect: {
						id:
							edits.procedureId === APPLICATION_PROCEDURE_ID.WRITTEN_REPS
								? APPLICATION_STAGE_ID.WRITTEN_REPRESENTATIONS
								: edits.procedureId
					}
				};
			}
		} else {
			// Added to handle the case where a procedure is removed (set to null)
			crownDevelopmentUpdateInput.Procedure = {
				disconnect: true
			};
			if (stageIsProcedure(viewModel.stageId)) {
				crownDevelopmentUpdateInput.Stage = {
					connect: { id: APPLICATION_STAGE_ID.PROCEDURE_DECISION }
				};
			}
		}
		crownDevelopmentUpdateInput.procedureNotificationDate = null;
		if (viewModel.eventId) {
			// delete existing event if procedure changed and there is an existing event
			crownDevelopmentUpdateInput.Event = {
				delete: true
			};
		}
	}
	if (hasProcedure(viewModel.procedureId)) {
		const eventUpdates = viewModelToEventUpdateInput(edits, viewModel.procedureId);

		if (eventUpdates.eventUpdateInput && Object.keys(eventUpdates.eventUpdateInput).length > 0) {
			crownDevelopmentUpdateInput.Event = {
				upsert: {
					where: optionalWhere(viewModel.eventId),
					create: eventUpdates.eventUpdateInput as Prisma.EventCreateWithoutCrownDevelopmentInput,
					update: eventUpdates.eventUpdateInput
				}
			};
		}
		if (eventUpdates.procedureNotificationDate) {
			crownDevelopmentUpdateInput.procedureNotificationDate = eventUpdates.procedureNotificationDate;
		}
	}

	// If you select no for hasSecondaryLpa then it should remove the secondaryLpa answers,
	// and if you remove the secondaryLpa then it should set hasSecondaryLpa to false
	if (
		('hasSecondaryLpa' in edits && edits.hasSecondaryLpa === false) ||
		('secondaryLpaId' in edits && edits.secondaryLpaId === null)
	) {
		crownDevelopmentUpdateInput.hasSecondaryLpa = false;

		crownDevelopmentUpdateInput.SecondaryLpa = { disconnect: true };
	}
	return crownDevelopmentUpdateInput;
}

/**
 * Populates contact and address fields in the view model for either the applicant or agent contact.
 * TODO remove CROWN-1509
 */
function addContactToViewModel(
	viewModel: CrownDevelopmentViewModel,
	contact: Prisma.ContactGetPayload<{ include: { Address: true } }> | null,
	prefix: ContactTypeValues
) {
	if (contact) {
		viewModel[`${prefix}ContactName`] = contact.orgName ?? undefined;
		viewModel[`${prefix}ContactTelephoneNumber`] = contact.telephoneNumber ?? undefined;
		viewModel[`${prefix}ContactEmail`] = contact.email ?? undefined;
		if (contact.Address) {
			viewModel[`${prefix}ContactAddress`] = addressToViewModel(contact.Address);
			viewModel[`${prefix}ContactAddressId`] = contact.addressId ?? undefined;
		}
	}
}

/**
 * Populates LPA or secondary LPA contact and address fields in the view model using a prefix.
 */
function addLpaDetailsToViewModel(
	viewModel: Partial<CrownDevelopmentViewModel>,
	lpa: Prisma.LpaGetPayload<{ include: { Address: true } }> | null | undefined,
	prefix: 'lpa' | 'secondaryLpa' = 'lpa'
) {
	if (lpa) {
		viewModel[`${prefix}TelephoneNumber`] = lpa.telephoneNumber ?? '';
		viewModel[`${prefix}Email`] = lpa.email ?? '';
		if (lpa.Address) {
			viewModel[`${prefix}Address`] = addressToViewModel(lpa.Address);
		}
	}
}

/**
 * Populates event fields in the view model using a prefix based on the procedure type (inquiry, hearing, or written reps).
 */
function addEventToViewModel(
	viewModel: Partial<CrownDevelopmentViewModel>,
	event: Prisma.EventGetPayload<object> | null,
	procedureId: ProcedureId,
	procedureNotificationDate: Date | null
) {
	const prefix = eventPrefix(procedureId);
	viewModel[`${prefix}ProcedureNotificationDate`] = procedureNotificationDate ?? undefined;
	// Written reps do not have event details
	if (isWrittenRepsPrefix(prefix) || !event) {
		return;
	}
	viewModel[`${prefix}Date`] = event.date ?? undefined;
	viewModel[`${prefix}Venue`] = event.venue ?? undefined;
	viewModel[`${prefix}NotificationDate`] = event.notificationDate ?? undefined;

	if (isInquiryPrefix(prefix)) {
		viewModel[`${prefix}StatementsDate`] = event.statementsDate ?? undefined;
		viewModel[`${prefix}CaseManagementConferenceDate`] = event.caseManagementConferenceDate ?? undefined;
		viewModel[`${prefix}PreMeetingDate`] = event.preMeetingDate ?? undefined;
	}

	const prep = event.prepDuration ?? '';
	const sitting = event.sittingDuration ?? '';
	const reporting = event.reportingDuration ?? '';

	if (
		(prep === '' || prep === null) &&
		(sitting === '' || sitting === null) &&
		(reporting === '' || reporting === null)
	) {
		viewModel[`${prefix}Duration`] = '-';
	} else {
		delete viewModel[`${prefix}Duration`];
		viewModel[`${prefix}DurationPrep`] = prep ? prep.toNumber() : undefined;
		viewModel[`${prefix}DurationSitting`] = sitting ? sitting.toNumber() : undefined;
		viewModel[`${prefix}DurationReporting`] = reporting ? reporting.toNumber() : undefined;
	}

	if (isHearingPrefix(prefix)) {
		viewModel[`${prefix}IssuesReportPublishedDate`] = event.issuesReportPublishedDate ?? undefined;
	}
	if (isInquiryPrefix(prefix)) {
		viewModel[`${prefix}ProofsOfEvidenceDate`] = event.proofsOfEvidenceDate ?? undefined;
	}
}

/**
 * Type guard to check if a given procedureId is one of the valid procedure types (inquiry, hearing, or written reps).
 */
function hasProcedure(procedureId?: string | null): procedureId is ProcedureId {
	if (!procedureId) {
		return false;
	}
	return isInquiry(procedureId) || isHearing(procedureId) || isWrittenReps(procedureId);
}

function stageIsProcedure(stageId?: string): stageId is ProcedureId {
	return hasProcedure(stageId);
}

function isWrittenReps(procedureId?: string): procedureId is 'written-reps' {
	return procedureId === APPLICATION_PROCEDURE_ID.WRITTEN_REPS;
}

function isInquiry(procedureId?: string): procedureId is 'inquiry' {
	return procedureId === APPLICATION_PROCEDURE_ID.INQUIRY;
}

function isHearing(procedureId?: string): procedureId is 'hearing' {
	return procedureId === APPLICATION_PROCEDURE_ID.HEARING;
}

function isWrittenRepsPrefix(prefix?: string): prefix is 'writtenReps' {
	return prefix === 'writtenReps';
}

function isInquiryPrefix(prefix?: string): prefix is 'inquiry' {
	return prefix === 'inquiry';
}

function isHearingPrefix(prefix?: string): prefix is 'hearing' {
	return prefix === 'hearing';
}

/**
 * Convert a procedure ID to the corresponding prefix used for event fields in the view model.
 */
function eventPrefix(procedureId?: ProcedureId): ProcedurePrefix {
	switch (procedureId) {
		case APPLICATION_PROCEDURE_ID.INQUIRY:
			return 'inquiry';
		case APPLICATION_PROCEDURE_ID.HEARING:
			return 'hearing';
		case APPLICATION_PROCEDURE_ID.WRITTEN_REPS:
			return 'writtenReps';
	}
	throw new Error(
		`invalid procedureId, expected ${APPLICATION_PROCEDURE_ID.HEARING}, ${APPLICATION_PROCEDURE_ID.INQUIRY}, or ${APPLICATION_PROCEDURE_ID.WRITTEN_REPS}, got ${procedureId}`
	);
}

type EventUpdates = {
	eventUpdateInput: Prisma.EventUpdateInput | null;
	procedureNotificationDate: Date | null;
};

/**
 * Maps event-related fields from the view model to an EventUpdateInput for updating the related Event record in the database, based on the procedure type.
 */
function viewModelToEventUpdateInput(edits: CrownDevelopmentSaveModel, procedureId?: ProcedureId): EventUpdates {
	const eventUpdateInput: Prisma.EventUpdateInput = {};
	const updates: EventUpdates = {
		eventUpdateInput: null,
		procedureNotificationDate: null
	};

	const prefix = eventPrefix(procedureId);

	if (isWrittenRepsPrefix(prefix)) {
		if ('writtenRepsProcedureNotificationDate' in edits) {
			updates.procedureNotificationDate = edits.writtenRepsProcedureNotificationDate ?? null;
		}

		return updates;
	}

	if (isHearingPrefix(prefix)) {
		if ('hearingProcedureNotificationDate' in edits) {
			updates.procedureNotificationDate = edits.hearingProcedureNotificationDate ?? null;
		}

		if ('hearingDate' in edits) {
			eventUpdateInput.date = edits.hearingDate;
		}
		if ('hearingVenue' in edits) {
			eventUpdateInput.venue = edits.hearingVenue;
		}
		if ('hearingNotificationDate' in edits) {
			eventUpdateInput.notificationDate = edits.hearingNotificationDate;
		}
		if ('hearingIssuesReportPublishedDate' in edits) {
			eventUpdateInput.issuesReportPublishedDate = edits.hearingIssuesReportPublishedDate;
		}
		if ('hearingDurationPrep' in edits) {
			eventUpdateInput.prepDuration = parseNumberStringToNumber(edits.hearingDurationPrep);
		}
		if ('hearingDurationSitting' in edits) {
			eventUpdateInput.sittingDuration = parseNumberStringToNumber(edits.hearingDurationSitting);
		}
		if ('hearingDurationReporting' in edits) {
			eventUpdateInput.reportingDuration = parseNumberStringToNumber(edits.hearingDurationReporting);
		}

		if (Object.keys(eventUpdateInput).length > 0) {
			updates.eventUpdateInput = eventUpdateInput;
		}

		return updates;
	}

	if (isInquiryPrefix(prefix)) {
		if ('inquiryProcedureNotificationDate' in edits) {
			updates.procedureNotificationDate = edits.inquiryProcedureNotificationDate ?? null;
		}

		if ('inquiryDate' in edits) {
			eventUpdateInput.date = edits.inquiryDate;
		}
		if ('inquiryVenue' in edits) {
			eventUpdateInput.venue = edits.inquiryVenue;
		}
		if ('inquiryNotificationDate' in edits) {
			eventUpdateInput.notificationDate = edits.inquiryNotificationDate;
		}
		if ('inquiryStatementsDate' in edits) {
			eventUpdateInput.statementsDate = edits.inquiryStatementsDate;
		}
		if ('inquiryCaseManagementConferenceDate' in edits) {
			eventUpdateInput.caseManagementConferenceDate = edits.inquiryCaseManagementConferenceDate;
		}
		if ('inquiryPreMeetingDate' in edits) {
			eventUpdateInput.preMeetingDate = edits.inquiryPreMeetingDate;
		}
		if ('inquiryProofsOfEvidenceDate' in edits) {
			eventUpdateInput.proofsOfEvidenceDate = edits.inquiryProofsOfEvidenceDate;
		}
		if ('inquiryDurationPrep' in edits) {
			eventUpdateInput.prepDuration = parseNumberStringToNumber(edits.inquiryDurationPrep);
		}
		if ('inquiryDurationSitting' in edits) {
			eventUpdateInput.sittingDuration = parseNumberStringToNumber(edits.inquiryDurationSitting);
		}
		if ('inquiryDurationReporting' in edits) {
			eventUpdateInput.reportingDuration = parseNumberStringToNumber(edits.inquiryDurationReporting);
		}
	}

	if (Object.keys(eventUpdateInput).length > 0) {
		updates.eventUpdateInput = eventUpdateInput;
	}

	return updates;
}
