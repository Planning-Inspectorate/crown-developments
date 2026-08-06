import { Prisma } from '@pins/crowndev-database/src/client/client.ts';
import {
	APPLICANT_TYPE_ID,
	SITE_AREA_UNIT_ID,
	CONTACT_ROLES_ID,
	CONTACT_ROLES
} from '@pins/crowndev-database/src/seed/s62a/data-static.ts';
import { viewModelToAddressUpdateInput } from '@pins/crowndev-lib/util/address.ts';
import type { YesNo } from '@pins/crowndev-lib/util/types.ts';
import { type Address, yesNoToBoolean } from '@planning-inspectorate/dynamic-forms';
import {
	S62A_DATE_FIELDS,
	FEE_BOOLEAN_FIELDS,
	FEE_NUMBER_FIELDS,
	FEE_DATE_FIELDS,
	FEE_STRING_FIELDS,
	CASE_TEAM_USER_RELATIONS,
	type CaseTeamInspectorItem,
	type S62aCaseViewModel,
	EVENT_DATE_FIELDS,
	EVENT_NUMBER_FIELDS,
	EVENT_STRING_FIELDS,
	type WasteTypeItem,
	RESIDENTIAL_BOOLEAN_FIELDS
} from './view-model.ts';
import {
	type AgentContactAnswer,
	type ApplicantOrganisationAnswer,
	type ApplicantContactAnswer,
	type AdditionalContactAnswer
} from '../util/party-types.ts';
import { addBusinessDays } from 'date-fns';
import { optionalWhere } from '@pins/crowndev-lib/util/database.ts';
import { slugify, sentenceCase } from '@pins/crowndev-lib/util/string.ts';
import { toDecimalOrNull } from '@pins/crowndev-lib/util/numbers.ts';

const DATE_FIELDS_SET = new Set<string>(S62A_DATE_FIELDS);
const FEE_BOOLEAN_SET = new Set<string>(FEE_BOOLEAN_FIELDS);
const FEE_NUMBER_SET = new Set<string>(FEE_NUMBER_FIELDS);
const FEE_DATE_SET = new Set<string>(FEE_DATE_FIELDS);
const FEE_STRING_SET = new Set<string>(FEE_STRING_FIELDS);
const EVENT_DATE_SET = new Set<string>(EVENT_DATE_FIELDS);
const EVENT_NUMBER_SET = new Set<string>(EVENT_NUMBER_FIELDS);
const EVENT_STRING_SET = new Set<string>(EVENT_STRING_FIELDS);
const RESIDENTIAL_BOOLEAN_SET = new Set<string>(RESIDENTIAL_BOOLEAN_FIELDS);

export interface UpdateCaseAnswers {
	s62aStatusId?: string;
	developmentDescription?: string;
	typeId?: string;
	applicationPhaseId?: string | null;
	classificationId?: string | null;
	lpaId?: string;
	hasSecondaryLpa?: YesNo;
	secondaryLpaId?: string | null;
	siteNorthing?: number;
	siteEasting?: number;
	siteAreaHectares?: number;
	siteAreaSquareMetres?: number;
	expectedSubmissionDate?: Date;
	specialismId?: string;
	inspectorBandId?: string;
	subTypeId?: string;
	siteIsVisibleFromPublicLand?: YesNo;
	siteAddress?: Address;
	likelyIssues?: string;
	representationsPeriod?: { start: Date | null; end: Date | null };
	representationsPublishDate?: Date | null;

	notificationReceivedDate?: Date | null;
	applicationReceivedDate?: Date | null;
	applicationAcknowledgedDate?: Date | null;
	furtherInformationRequestedDate?: Date | null;
	agreedForAdditionalInformationDate?: Date | null;
	applicationValidDate?: Date | null;
	validLettersSentDate?: Date | null;
	lpaQuestionnaireSentDate?: Date | null;
	lpaQuestionnaireReceivedDate?: Date | null;
	targetPublishDate?: Date | null;
	publishDate?: Date | null;
	pressNoticeDate?: Date | null;
	neighboursNotifiedByLpaDate?: Date | null;
	lpaInterestedPartiesDeadlineDate?: Date | null;
	siteNoticeByLpaDate?: Date | null;
	interestedPartiesPressNoticeDeadlineDate?: Date | null;
	mineralApplicationsDate?: Date | null;
	interimFindingsDate?: Date | null;
	reconsultationDetailsSentDate?: Date | null;
	reconsultationDetailsDeadlineDate?: Date | null;
	s106SubmittedDate?: Date | null;
	targetDecisionDate?: Date | null;
	extendedTargetDecisionDate?: Date | null;
	recoveredDate?: Date | null;
	withdrawnDate?: Date | null;
	turnedAwayDate?: Date | null;
	reconsultationDetailsDate?: { start: Date | null; end: Date | null };

	hasPreApplicationFee?: boolean | YesNo | null;
	preApplicationFee?: string | number | null;
	chargingScheduleSentDate?: Date | null;
	invoiceDate?: Date | null;
	preApplicationFeeReceivedDate?: Date | null;

	hasApplicationFee?: boolean | YesNo | null;
	applicationFee?: string | number | null;
	applicationFeeReceivedDate?: Date | null;

	eligibleForFeeRefund?: boolean | YesNo | null;
	applicationFeeRefundAmount?: string | number | null;
	applicationFeeRefundDate?: Date | null;
	// Details tab
	stageId?: string | null;
	categoryId?: string | null;
	procedureId?: string | null;
	lpaReference?: string;
	listedBuildingReference?: string;
	healthAndSafetyIssue?: string;
	isGreenBelt?: YesNo;
	cilLiable?: YesNo;
	bngExempt?: YesNo;
	cilAmount?: number;

	lpaFirstName?: string;
	lpaLastName?: string;
	lpaEmailAddress?: string;
	lpaPhoneNumber?: string;

	secondaryLpaFirstName?: string;
	secondaryLpaLastName?: string;
	secondaryLpaEmailAddress?: string;
	secondaryLpaPhoneNumber?: string;

	hasAgent?: YesNo;
	agentName?: string;
	agentAddress?: Address;
	manageAgentContactDetails?: AgentContactAnswer[];

	applicantType?: 'organisation' | 'individual';
	manageApplicantOrganisations?: ApplicantOrganisationAnswer[];
	manageApplicantContactDetails?: ApplicantContactAnswer[];

	manageAdditionalContacts?: AdditionalContactAnswer[];

	// EIA tab
	eiaScreening?: boolean | YesNo | null;
	eiaScreeningOutcome?: boolean | YesNo | null;
	environmentalStatementReceivedDate?: Date | null;

	// Case Team tab
	assessorInspectorId?: string | null;
	caseOfficerId?: string | null;
	planningOfficerId?: string | null;
	readerId?: string | null;
	manageCaseTeamInspectors?: CaseTeamInspectorItem[] | null;

	// Pre-Application tab
	preApplicationAdviceId?: string | null;
	preApplicationReference?: string;
	preApplicationReceivedDate?: Date | null;
	preApplicationAdviceIssuedDate?: Date | null;

	// Outcome tab
	outcomeTypeId?: string | null;
	decisionOutcomeId?: string | null;
	decisionDate?: Date | null;
	recoveredReportSentDate?: Date | null;

	// Event tab
	procedureNotificationDate?: Date | null;
	hearingDate?: Date | null;
	prepDuration?: string | null;
	sittingDuration?: string | null;
	reportingDuration?: string | null;
	venue?: string;
	notificationDate?: Date | null;
	additionalMeetingDate?: Date | null;
	issuesReportingPublishedDate?: Date | null;
	siteVisitDate?: Date | null;
	siteVisitTypeId?: string | null;

	// Waste tab
	wasteActivitiesDescription?: string;
	isWasteManagementDevelopment?: YesNo;
	manageWasteTypes?: WasteTypeItem[] | null;

	//Press Notice tab
	pressNoticeCost?: number | null;
	pressNoticeReference?: string | null;
	pressNoticePlaced?: string | null;

	// Residential tab
	hasResidentialUnitsChange?: boolean | null;
	hasExistingHousing?: boolean | null;
	hasProposedHousing?: boolean | null;
}

/**
 * Class that handles mapping an update request into the correct
 * form for a DB interaction.
 *
 * TODO: break down monolith into sub classes if and when we start to
 * have too many input field reference tables.
 */
export class S62aCaseUpdateMapper {
	private answers: UpdateCaseAnswers;
	private existingCase?: S62aCaseViewModel;

	constructor(answers: UpdateCaseAnswers, existingCase?: S62aCaseViewModel) {
		this.answers = answers;
		this.existingCase = existingCase;
	}

	/**
	 * Transforms the partial update payload into a Prisma Update Input.
	 */
	public generateUpdateInput(): Prisma.S62aCaseUpdateInput {
		const input: Prisma.S62aCaseUpdateInput = {};

		this.mapScalars(input);
		this.mapLookups(input);
		this.mapAddress(input);
		this.mapDates(input);
		this.mapFees(input);
		this.mapLpaContacts(input);
		this.mapApplicantsAndAgents(input);
		this.mapEiaScalars(input);
		this.mapCaseTeam(input);
		this.mapEvent(input);
		this.mapWaste(input);
		this.mapPressNotice(input);
		this.mapResidential(input);

		return input;
	}

	/**
	 * Handles basic scalar fields, things that are just columns
	 * on the base S62A table.
	 */
	private mapScalars(input: Prisma.S62aCaseUpdateInput): void {
		const ans = this.answers;

		if (this.hasAnswer('developmentDescription')) {
			input.description = ans.developmentDescription || '';
		}

		if (this.hasAnswer('likelyIssues')) {
			input.likelyIssues = ans.likelyIssues || null;
		}

		if (this.hasAnswer('expectedSubmissionDate')) {
			input.expectedSubmissionDate = ans.expectedSubmissionDate;
		}

		if (this.hasAnswer('hasSecondaryLpa')) {
			input.hasSecondaryLpa = yesNoToBoolean(ans.hasSecondaryLpa);
		}

		if (this.hasAnswer('representationsPeriod')) {
			const representationsPeriod = this.answers.representationsPeriod;
			input.representationsPeriodStartDate = representationsPeriod?.start ? representationsPeriod.start : null;
			input.representationsPeriodEndDate = representationsPeriod?.end ? representationsPeriod.end : null;
		}

		if (this.hasAnswer('representationsPublishDate')) {
			input.representationsPublishDate = ans.representationsPublishDate;
		}

		if (this.hasAnswer('hasAgent')) {
			input.hasAgent = yesNoToBoolean(ans.hasAgent);
		}

		this.mapLocationScalars(input);
		this.mapDetailsScalars(input);
	}

	/**
	 * Maps fields to do with the location (e.g. site northing, site area...)
	 */
	private mapLocationScalars(input: Prisma.S62aCaseUpdateInput): void {
		const ans = this.answers;

		if (this.hasAnswer('siteIsVisibleFromPublicLand')) {
			input.siteIsVisibleFromPublicLand =
				typeof ans.siteIsVisibleFromPublicLand === 'boolean' ? yesNoToBoolean(ans.siteIsVisibleFromPublicLand) : null;
		}

		if (this.hasAnswer('siteNorthing')) {
			input.siteNorthing = ans.siteNorthing || ans.siteNorthing === 0 ? Number(ans.siteNorthing) : null;
		}

		if (this.hasAnswer('siteEasting')) {
			input.siteEasting = ans.siteEasting || ans.siteEasting === 0 ? Number(ans.siteEasting) : null;
		}

		if (this.hasAnswer('siteAreaSquareMetres') || this.hasAnswer('siteAreaHectares')) {
			if (ans.siteAreaSquareMetres) {
				input.siteAreaInSquareMetres = Number(ans.siteAreaSquareMetres);
				input.SiteAreaOriginalUnit = { connect: { id: SITE_AREA_UNIT_ID.METRES_SQUARED } };
			} else if (ans.siteAreaHectares) {
				input.siteAreaInSquareMetres = new Prisma.Decimal(ans.siteAreaHectares).times(10000);
				input.SiteAreaOriginalUnit = { connect: { id: SITE_AREA_UNIT_ID.HECTARES } };
			} else {
				input.siteAreaInSquareMetres = null;
				input.SiteAreaOriginalUnit = { disconnect: true };
			}
		}
	}

	/**
	 * Maps the Details tab scalar fields (references, H&S, green belt, CIL, BNG)
	 */
	private mapDetailsScalars(input: Prisma.S62aCaseUpdateInput): void {
		const ans = this.answers;

		if (this.hasAnswer('lpaReference')) {
			input.lpaReference = ans.lpaReference || null;
		}

		if (this.hasAnswer('listedBuildingReference')) {
			input.listedBuildingReference = ans.listedBuildingReference || null;
		}

		if (this.hasAnswer('healthAndSafetyIssue')) {
			input.healthAndSafetyIssue = ans.healthAndSafetyIssue || null;
		}

		if (this.hasAnswer('isGreenBelt')) {
			input.isGreenBelt = typeof ans.isGreenBelt === 'boolean' ? yesNoToBoolean(ans.isGreenBelt) : null;
		}

		if (this.hasAnswer('cilLiable')) {
			input.cilLiable = typeof ans.cilLiable === 'boolean' ? yesNoToBoolean(ans.cilLiable) : null;
		}

		if (this.hasAnswer('bngExempt')) {
			input.bngExempt = typeof ans.bngExempt === 'boolean' ? yesNoToBoolean(ans.bngExempt) : null;
		}

		if (this.hasAnswer('cilAmount')) {
			input.cilAmount = ans.cilAmount || ans.cilAmount === 0 ? new Prisma.Decimal(ans.cilAmount) : null;
		}

		if (this.hasAnswer('preApplicationReference')) {
			input.preApplicationReference = ans.preApplicationReference || null;
		}
	}

	/**
	 * Handles fields that are joins onto another table, still basic
	 * not handling things like many-many complex joins.
	 */
	private mapLookups(input: Prisma.S62aCaseUpdateInput): void {
		const ans = this.answers;

		if (ans.s62aStatusId) input.S62aStatus = { connect: { id: ans.s62aStatusId } };

		if (ans.typeId) input.Type = { connect: { id: ans.typeId } };

		if (ans.lpaId) input.Lpa = { connect: { id: ans.lpaId } };

		if (ans.applicantType) input.ApplicantType = { connect: { id: ans.applicantType } };

		if (this.hasAnswer('applicationPhaseId')) {
			input.ApplicationPhase = ans.applicationPhaseId
				? { connect: { id: ans.applicationPhaseId } }
				: { disconnect: true };
		}

		if (this.hasAnswer('classificationId')) {
			input.Classification = ans.classificationId ? { connect: { id: ans.classificationId } } : { disconnect: true };
		}

		if (this.hasAnswer('secondaryLpaId')) {
			input.SecondaryLpa = ans.secondaryLpaId ? { connect: { id: ans.secondaryLpaId } } : { disconnect: true };
		}

		if (this.hasAnswer('specialismId')) {
			input.Specialism = ans.specialismId ? { connect: { id: ans.specialismId } } : { disconnect: true };
		}

		if (this.hasAnswer('inspectorBandId')) {
			input.InspectorBand = ans.inspectorBandId ? { connect: { id: ans.inspectorBandId } } : { disconnect: true };
		}

		if (this.hasAnswer('subTypeId')) {
			input.SubType = ans.subTypeId ? { connect: { id: ans.subTypeId } } : { disconnect: true };
		}

		if (this.hasAnswer('stageId')) {
			input.Stage = ans.stageId ? { connect: { id: ans.stageId } } : { disconnect: true };
		}

		if (this.hasAnswer('categoryId')) {
			input.Category = ans.categoryId ? { connect: { id: ans.categoryId } } : { disconnect: true };
		}

		if (this.hasAnswer('procedureId')) {
			input.Procedure = ans.procedureId ? { connect: { id: ans.procedureId } } : { disconnect: true };
		}

		if (this.hasAnswer('preApplicationAdviceId')) {
			input.PreApplicationAdvice = ans.preApplicationAdviceId
				? { connect: { id: ans.preApplicationAdviceId } }
				: { disconnect: true };
		}

		if (this.hasAnswer('outcomeTypeId')) {
			input.OutcomeType = ans.outcomeTypeId ? { connect: { id: ans.outcomeTypeId } } : { disconnect: true };
		}

		if (this.hasAnswer('decisionOutcomeId')) {
			input.DecisionOutcome = ans.decisionOutcomeId ? { connect: { id: ans.decisionOutcomeId } } : { disconnect: true };
		}
	}

	/**
	 * Handles the semi-unique case of addresses being an object with unpopulated / populated keys.
	 * Decouples the relation if the submitted address is null.
	 */
	private mapAddress(input: Prisma.S62aCaseUpdateInput): void {
		if (this.hasAnswer('siteAddress')) {
			const rawAddress = this.answers.siteAddress;

			if (rawAddress) {
				const addressData = viewModelToAddressUpdateInput(rawAddress);
				input.SiteAddress = { upsert: { create: addressData, update: addressData } };
			} else {
				input.SiteAddress = { disconnect: true };
			}
		}
	}

	/**
	 * Creates the dates on the Dates reference table
	 */
	private mapDates(input: Prisma.S62aCaseUpdateInput): void {
		const datesToUpdate: Prisma.S62aDatesUpdateWithoutS62aCaseInput & Prisma.S62aDatesCreateWithoutS62aCaseInput = {};
		let hasDateUpdates = false;

		for (const [key, value] of Object.entries(this.answers)) {
			if (this.isDateField(key)) {
				datesToUpdate[key] = (value as Date | undefined) || null;
				hasDateUpdates = true;
			}
		}

		if (this.hasAnswer('applicationValidDate')) {
			const validDate = this.answers.applicationValidDate;
			datesToUpdate.targetPublishDate = validDate ? addBusinessDays(validDate, 5) : null;
			hasDateUpdates = true;
		}

		if (this.hasAnswer('reconsultationDetailsDate')) {
			const reconsultationDetails = this.answers.reconsultationDetailsDate;
			datesToUpdate.reconsultationDetailsSentDate = reconsultationDetails?.start ? reconsultationDetails.start : null;
			datesToUpdate.reconsultationDetailsDeadlineDate = reconsultationDetails?.end ? reconsultationDetails.end : null;
			hasDateUpdates = true;
		}

		if (hasDateUpdates) {
			input.S62aDates = {
				upsert: {
					create: datesToUpdate,
					update: datesToUpdate
				}
			};
		}
	}

	/**
	 * Creates the data on the Fees reference table
	 */
	private mapFees(input: Prisma.S62aCaseUpdateInput): void {
		const feesToUpdate: Prisma.S62aFeesUpdateWithoutS62aCaseInput & Prisma.S62aFeesCreateWithoutS62aCaseInput = {};
		let hasFeeUpdates = false;

		for (const [key, value] of Object.entries(this.answers)) {
			if (this.isFeeBooleanField(key)) {
				feesToUpdate[key] = yesNoToBoolean(value);
				hasFeeUpdates = true;
			} else if (this.isFeeNumberField(key)) {
				feesToUpdate[key] = value === null || value === '' ? null : Number(value);
				hasFeeUpdates = true;
			} else if (this.isFeeDateField(key)) {
				feesToUpdate[key] = (value as Date) || null;
				hasFeeUpdates = true;
			} else if (this.isFeeStringField(key)) {
				feesToUpdate[key] = (value as string) || null;
				hasFeeUpdates = true;
			}
		}

		if (hasFeeUpdates) {
			input.S62aFees = {
				upsert: {
					create: feesToUpdate,
					update: feesToUpdate
				}
			};
		}
	}

	/**
	 * Creates the data on the Event reference table
	 */
	private mapEvent(input: Prisma.S62aCaseUpdateInput): void {
		const eventToUpdate: Prisma.S62aEventUpdateWithoutS62aCaseInput & Prisma.S62aEventCreateWithoutS62aCaseInput = {};
		let hasEventUpdates = false;

		for (const [key, value] of Object.entries(this.answers)) {
			if (this.isEventDateField(key)) {
				eventToUpdate[key] = (value as Date) || null;
				hasEventUpdates = true;
			} else if (this.isEventNumberField(key)) {
				eventToUpdate[key] = value === null || value === '' ? null : new Prisma.Decimal(value as string | number);
				hasEventUpdates = true;
			} else if (this.isEventStringField(key)) {
				eventToUpdate[key] = (value as string) || null;
				hasEventUpdates = true;
			}
		}

		// Handled outside the loop: on write this is a relation, not a scalar column
		if (this.hasAnswer('siteVisitTypeId')) {
			eventToUpdate.SiteVisitType = this.answers.siteVisitTypeId
				? { connect: { id: this.answers.siteVisitTypeId } }
				: { disconnect: true };
			hasEventUpdates = true;
		}

		if (hasEventUpdates) {
			input.S62aEvent = {
				upsert: {
					create: eventToUpdate,
					update: eventToUpdate
				}
			};
		}
	}

	/**
	 * Maps the Waste tab.
	 *
	 * TODO: PEAS-399 — the waste type list is replaced wholesale on every save,
	 * so a minor edit deletes and recreates every row. Should be a diff instead
	 * (match by id, update/create/delete only what changed) before case history
	 * lands, or the history will show mass deletes and inserts for small changes.
	 */
	private mapWaste(input: Prisma.S62aCaseUpdateInput): void {
		const ans = this.answers;

		if (this.hasAnswer('wasteActivitiesDescription')) {
			input.wasteActivitiesDescription = ans.wasteActivitiesDescription || null;
		}

		if (this.hasAnswer('isWasteManagementDevelopment')) {
			input.isWasteManagementDevelopment =
				typeof ans.isWasteManagementDevelopment === 'boolean' ? yesNoToBoolean(ans.isWasteManagementDevelopment) : null;
		}

		// Deliberately not hasAnswer(): it returns false for an empty array, so
		// removing the last waste type would be skipped and the row would survive.
		if (ans.manageWasteTypes === undefined) return;

		const items = ans.manageWasteTypes ?? [];

		input.WasteTypes = {
			deleteMany: {},
			create: items
				.filter((item) => item.wasteTypeId)
				.map((item) => ({
					WasteType: { connect: { id: item.wasteTypeId! } },
					voidCapacity: this.selectedConditionalAmount(item, 'voidCapacityUnitId'),
					VoidCapacityUnit: item.voidCapacityUnitId ? { connect: { id: item.voidCapacityUnitId } } : undefined,
					maxAnnualThroughput: this.selectedConditionalAmount(item, 'maxAnnualThroughputUnitId'),
					MaxAnnualThroughputUnit: item.maxAnnualThroughputUnitId
						? { connect: { id: item.maxAnnualThroughputUnitId } }
						: undefined
				}))
		};
	}

	/**
	 * Creates the data on the Residential reference table
	 */
	private mapResidential(input: Prisma.S62aCaseUpdateInput): void {
		const residentialToUpdate: Prisma.S62aResidentialUpdateWithoutS62aCaseInput &
			Prisma.S62aResidentialCreateWithoutS62aCaseInput = {};
		let hasResidentialUpdates = false;

		for (const [key, value] of Object.entries(this.answers)) {
			if (this.isResidentialBooleanField(key)) {
				residentialToUpdate[key] = typeof value === 'boolean' ? yesNoToBoolean(value) : null;
				hasResidentialUpdates = true;
			}
		}

		if (hasResidentialUpdates) {
			input.S62aResidential = {
				upsert: {
					create: residentialToUpdate,
					update: residentialToUpdate
				}
			};
		}
	}

	/**
	 * Handles all the LPA contact fields for both primary
	 * and secondary LPAs.
	 */
	private mapLpaContacts(input: Prisma.S62aCaseUpdateInput): void {
		const hasLpaContactFields =
			this.hasAnswer('lpaFirstName') ||
			this.hasAnswer('lpaLastName') ||
			this.hasAnswer('lpaEmailAddress') ||
			this.hasAnswer('lpaPhoneNumber');

		if (hasLpaContactFields) {
			const lpaContactData = {
				firstName: this.answers.lpaFirstName || null,
				lastName: this.answers.lpaLastName || null,
				email: this.answers.lpaEmailAddress || null,
				telephoneNumber: this.answers.lpaPhoneNumber || null
			};
			input.LpaContact = {
				upsert: { create: lpaContactData, update: lpaContactData }
			};
		}

		const hasSecLpaContactFields =
			this.hasAnswer('secondaryLpaFirstName') ||
			this.hasAnswer('secondaryLpaLastName') ||
			this.hasAnswer('secondaryLpaEmailAddress') ||
			this.hasAnswer('secondaryLpaPhoneNumber');

		if (hasSecLpaContactFields) {
			const secLpaContactData = {
				firstName: this.answers.secondaryLpaFirstName || null,
				lastName: this.answers.secondaryLpaLastName || null,
				email: this.answers.secondaryLpaEmailAddress || null,
				telephoneNumber: this.answers.secondaryLpaPhoneNumber || null
			};
			input.SecondaryLpaContact = {
				upsert: { create: secLpaContactData, update: secLpaContactData }
			};
		}
	}

	/**
	 * Handles the manage list items for applicants and agent contacts, and their organisations,
	 * making sure to handle upserting old fields and creating new ones, including addresses.
	 */
	private mapApplicantsAndAgents(input: Prisma.S62aCaseUpdateInput): void {
		const updateOperations: Prisma.S62aToApplicantUpdateWithWhereUniqueWithoutS62AInput[] = [];
		const createOperations: Prisma.S62aToApplicantCreateWithoutS62AInput[] = [];

		this.mapAgentOrganisation(updateOperations, createOperations);
		this.mapAgentContacts(updateOperations);
		this.mapApplicantOrganisations(updateOperations, createOperations);
		this.mapApplicantContacts(updateOperations, createOperations);
		this.mapAdditionalContacts(updateOperations, createOperations);

		if (updateOperations.length > 0 || createOperations.length > 0) {
			input.S62aToApplicants = {};
			if (updateOperations.length > 0) input.S62aToApplicants.update = updateOperations;
			if (createOperations.length > 0) input.S62aToApplicants.create = createOperations;
		}
	}

	private mapAgentOrganisation(
		updateOperations: Prisma.S62aToApplicantUpdateWithWhereUniqueWithoutS62AInput[],
		createOperations: Prisma.S62aToApplicantCreateWithoutS62AInput[]
	): void {
		if (!this.hasAnswer('agentName') && !this.hasAnswer('agentAddress')) return;

		const agentRelId = this.existingCase?.agentRelationId;

		if (agentRelId) {
			let addressPayload;

			if (this.hasAnswer('agentAddress')) {
				if (this.answers.agentAddress) {
					const addressData = this.toAddressInput(this.answers.agentAddress);
					addressPayload = {
						upsert: {
							where: optionalWhere(this.existingCase?.agentOrganisationAddressId),
							create: addressData,
							update: addressData
						}
					};
				} else {
					addressPayload = { disconnect: true };
				}
			}

			updateOperations.push({
				where: { id: agentRelId },
				data: {
					Organisation: {
						update: {
							name: this.answers.agentName !== undefined ? this.answers.agentName : undefined,
							Address: addressPayload
						}
					}
				}
			});
		} else if (this.answers.agentName) {
			createOperations.push({
				Role: { connect: { id: CONTACT_ROLES_ID.AGENT } },
				Organisation: {
					create: {
						name: this.answers.agentName,
						Address: this.answers.agentAddress ? { create: this.toAddressInput(this.answers.agentAddress) } : undefined
					}
				}
			});
		}
	}

	private mapAgentContacts(updateOperations: Prisma.S62aToApplicantUpdateWithWhereUniqueWithoutS62AInput[]): void {
		if (!this.answers.manageAgentContactDetails) return;

		const agentRelId = this.existingCase?.agentRelationId;
		if (!agentRelId) return;

		for (const contact of this.answers.manageAgentContactDetails) {
			if (contact.organisationToContactRelationId) {
				updateOperations.push({
					where: { id: agentRelId },
					data: {
						Organisation: {
							update: {
								OrganisationToContact: {
									update: {
										where: { id: contact.organisationToContactRelationId },
										data: { Contact: { update: this.extractAgentContactFields(contact) } }
									}
								}
							}
						}
					}
				});
			} else {
				updateOperations.push({
					where: { id: agentRelId },
					data: {
						Organisation: {
							update: {
								OrganisationToContact: {
									create: [{ Contact: { create: this.extractAgentContactFields(contact) } }]
								}
							}
						}
					}
				});
			}
		}
	}

	private mapApplicantOrganisations(
		updateOperations: Prisma.S62aToApplicantUpdateWithWhereUniqueWithoutS62AInput[],
		createOperations: Prisma.S62aToApplicantCreateWithoutS62AInput[]
	): void {
		if (!this.answers.manageApplicantOrganisations) return;

		for (const org of this.answers.manageApplicantOrganisations) {
			if (org.organisationRelationId) {
				const addressData = org.organisationAddress ? this.toAddressInput(org.organisationAddress) : null;
				updateOperations.push({
					where: { id: org.organisationRelationId },
					data: {
						Organisation: {
							update: {
								name: org.organisationName,
								Address: addressData
									? {
											upsert: {
												where: optionalWhere(org.organisationAddressId),
												create: addressData,
												update: addressData
											}
										}
									: undefined
							}
						}
					}
				});
			} else {
				createOperations.push({
					Role: { connect: { id: CONTACT_ROLES_ID.APPLICANT } },
					Organisation: {
						create: {
							name: org.organisationName,
							Address: org.organisationAddress ? { create: this.toAddressInput(org.organisationAddress) } : undefined
						}
					}
				});
			}
		}
	}

	private mapApplicantContacts(
		updateOperations: Prisma.S62aToApplicantUpdateWithWhereUniqueWithoutS62AInput[],
		createOperations: Prisma.S62aToApplicantCreateWithoutS62AInput[]
	): void {
		if (!this.answers.manageApplicantContactDetails) return;

		if (this.existingCase?.applicantType === APPLICANT_TYPE_ID.ORGANISATION) {
			this.mapApplicantOrganisationContacts(updateOperations);
		} else if (this.existingCase?.applicantType === APPLICANT_TYPE_ID.INDIVIDUAL) {
			this.mapApplicantIndividualContacts(updateOperations, createOperations);
		}
	}

	private mapApplicantOrganisationContacts(
		updateOperations: Prisma.S62aToApplicantUpdateWithWhereUniqueWithoutS62AInput[]
	): void {
		const orgIdToRelId = new Map<string, string>();
		this.existingCase?.manageApplicantOrganisations?.forEach((org) => {
			if (org.id && org.organisationRelationId) orgIdToRelId.set(org.id, org.organisationRelationId);
		});

		for (const contact of this.answers.manageApplicantContactDetails!) {
			if (!contact.applicantContactOrganisation) continue;

			const targetRelId = orgIdToRelId.get(contact.applicantContactOrganisation);
			if (!targetRelId) continue;

			if (!contact.organisationToContactRelationId) {
				updateOperations.push({
					where: { id: targetRelId },
					data: {
						Organisation: {
							update: {
								OrganisationToContact: {
									create: [{ Contact: { create: this.extractApplicantContactFields(contact) } }]
								}
							}
						}
					}
				});
			} else {
				const existing = this.existingCase?.manageApplicantContactDetails?.find(
					(c) => c.organisationToContactRelationId === contact.organisationToContactRelationId
				);

				if (existing && existing.applicantContactOrganisation !== contact.applicantContactOrganisation) {
					const sourceRelId = existing.applicantContactOrganisation
						? orgIdToRelId.get(existing.applicantContactOrganisation)
						: undefined;

					if (sourceRelId && existing.id) {
						updateOperations.push({
							where: { id: sourceRelId },
							data: {
								Organisation: {
									update: {
										OrganisationToContact: {
											deleteMany: [{ id: contact.organisationToContactRelationId }]
										}
									}
								}
							}
						});
						updateOperations.push({
							where: { id: targetRelId },
							data: {
								Organisation: {
									update: {
										OrganisationToContact: {
											create: [{ Contact: { connect: { id: existing.id } } }]
										}
									}
								}
							}
						});
					}
				} else {
					updateOperations.push({
						where: { id: targetRelId },
						data: {
							Organisation: {
								update: {
									OrganisationToContact: {
										update: {
											where: { id: contact.organisationToContactRelationId },
											data: { Contact: { update: this.extractApplicantContactFields(contact) } }
										}
									}
								}
							}
						}
					});
				}
			}
		}
	}

	private mapApplicantIndividualContacts(
		updateOperations: Prisma.S62aToApplicantUpdateWithWhereUniqueWithoutS62AInput[],
		createOperations: Prisma.S62aToApplicantCreateWithoutS62AInput[]
	): void {
		for (const contact of this.answers.manageApplicantContactDetails!) {
			if (contact.applicantRelationId) {
				updateOperations.push({
					where: { id: contact.applicantRelationId },
					data: {
						Contact: { update: this.extractApplicantContactFields(contact) }
					}
				});
			} else {
				createOperations.push({
					Role: { connect: { id: CONTACT_ROLES_ID.APPLICANT } },
					Contact: { create: this.extractApplicantContactFields(contact) }
				});
			}
		}
	}

	/**
	 * Handles the additional contacts field
	 */
	private mapAdditionalContacts(
		updateOperations: Prisma.S62aToApplicantUpdateWithWhereUniqueWithoutS62AInput[],
		createOperations: Prisma.S62aToApplicantCreateWithoutS62AInput[]
	): void {
		if (!this.answers.manageAdditionalContacts) return;

		for (const contact of this.answers.manageAdditionalContacts) {
			let roleId: string = CONTACT_ROLES_ID.INTERESTED_PARTY;
			let roleDisplayName = CONTACT_ROLES.find((role) => role.id === roleId)?.displayName || 'Interested party';

			if (contact.additionalContactType === 'other' && contact.additionalContactType_otherContactType) {
				roleId = slugify(contact.additionalContactType_otherContactType);
				roleDisplayName = sentenceCase(contact.additionalContactType_otherContactType);
			} else if (contact.additionalContactType) {
				roleId = contact.additionalContactType;
			}

			const addressData = contact.additionalContactAddress
				? this.toAddressInput(contact.additionalContactAddress)
				: null;

			const contactData = {
				firstName: contact.firstName || null,
				lastName: contact.lastName || null,
				orgName: contact.organisationName || null,
				email: contact.emailAddress || null,
				telephoneNumber: contact.phoneNumber || null,
				...(addressData && { Address: { create: addressData } })
			};

			const dataToUpdateOrCreate = {
				Role: {
					connectOrCreate: {
						where: { id: roleId },
						create: {
							id: roleId,
							displayName: roleDisplayName
						}
					}
				}
			};

			if (contact.additionalContactRelationId) {
				updateOperations.push({
					where: { id: contact.additionalContactRelationId },
					data: {
						...dataToUpdateOrCreate,
						Contact: {
							update: contactData
						}
					}
				});
			} else {
				createOperations.push({
					...dataToUpdateOrCreate,
					Contact: {
						create: contactData
					}
				});
			}
		}
	}

	private extractApplicantContactFields(contact: ApplicantContactAnswer): Prisma.ContactCreateInput {
		return {
			firstName: contact.applicantFirstName || null,
			lastName: contact.applicantLastName || null,
			email: contact.applicantContactEmail || null,
			telephoneNumber: contact.applicantContactTelephoneNumber || null
		};
	}

	private extractAgentContactFields(contact: AgentContactAnswer): Prisma.ContactCreateInput {
		return {
			firstName: contact.agentFirstName || null,
			lastName: contact.agentLastName || null,
			email: contact.agentContactEmail || null,
			telephoneNumber: contact.agentContactTelephoneNumber || null
		};
	}

	private toAddressInput(address: Address) {
		return {
			line1: address.addressLine1,
			line2: address.addressLine2,
			townCity: address.townCity,
			county: address.county,
			postcode: address.postcode
		};
	}

	/*
	 * Maps the EIA tab scalar fields.
	 * environmentalStatementReceivedDate is handled by mapDates via S62A_DATE_FIELDS.
	 */
	private mapEiaScalars(input: Prisma.S62aCaseUpdateInput): void {
		const ans = this.answers;

		if (this.hasAnswer('eiaScreening')) {
			input.eiaScreening = typeof ans.eiaScreening === 'boolean' ? yesNoToBoolean(ans.eiaScreening) : null;
		}

		if (this.hasAnswer('eiaScreeningOutcome')) {
			input.eiaScreeningOutcome =
				typeof ans.eiaScreeningOutcome === 'boolean' ? yesNoToBoolean(ans.eiaScreeningOutcome) : null;
		}
	}

	/**
	 * Maps the Case Team tab.
	 *
	 * Answers carry Entra IDs -the DB stores User relations, so each role is
	 * connectOrCreate'd on idpUserId.
	 */
	private mapCaseTeam(input: Prisma.S62aCaseUpdateInput): void {
		const ans = this.answers;

		for (const { field, relation } of CASE_TEAM_USER_RELATIONS) {
			if (!this.hasAnswer(field)) continue;

			const idpUserId = ans[field];
			input[relation] = idpUserId
				? { connectOrCreate: { where: { idpUserId }, create: { idpUserId } } }
				: { disconnect: true };
		}

		this.mapCaseTeamInspectors(input);
	}

	/**
	 * Replaces the inspector rows wholesale. Prisma runs deleteMany before
	 * create, so re-adding the same user in one save does not trip the
	 * (s62aCaseId, userId) unique constraint.
	 *
	 * TODO: PEAS-399 — see the note on mapWaste. Should be a diff rather than a
	 * full replace.
	 */
	private mapCaseTeamInspectors(input: Prisma.S62aCaseUpdateInput): void {
		// Deliberately didn't use hasAnswer() as it returns false for an empty array, so
		// removing the last inspector would be skipped and the row would survive.
		if (this.answers.manageCaseTeamInspectors === undefined) return;

		const items = this.answers.manageCaseTeamInspectors ?? [];

		input.Inspectors = {
			deleteMany: {},
			create: items
				.filter((item) => item.inspectorId)
				.map((item) => ({
					User: {
						connectOrCreate: {
							where: { idpUserId: item.inspectorId! },
							create: { idpUserId: item.inspectorId! }
						}
					},
					assignedDate: item.inspectorAssignedDate ? new Date(item.inspectorAssignedDate) : null,
					appointedDate: item.inspectorAppointedDate ? new Date(item.inspectorAppointedDate) : null
				}))
		};
	}
	/*
	 * Maps the Press Notice tab scalar fields.
	 */
	private mapPressNotice(input: Prisma.S62aCaseUpdateInput): void {
		const ans = this.answers;

		if (this.hasAnswer('pressNoticeCost')) {
			input.pressNoticeCost = toDecimalOrNull(ans.pressNoticeCost);
		}

		if (this.hasAnswer('pressNoticePlaced')) {
			input.pressNoticePlaced = typeof ans.pressNoticePlaced === 'string' ? ans.pressNoticePlaced : null;
		}

		if (this.hasAnswer('pressNoticeReference')) {
			input.pressNoticeReference = typeof ans.pressNoticeReference === 'string' ? ans.pressNoticeReference : null;
		}
	}

	private isDateField(key: string): key is (typeof S62A_DATE_FIELDS)[number] {
		return DATE_FIELDS_SET.has(key);
	}

	private isFeeBooleanField(key: string): key is (typeof FEE_BOOLEAN_FIELDS)[number] {
		return FEE_BOOLEAN_SET.has(key);
	}

	private isFeeNumberField(key: string): key is (typeof FEE_NUMBER_FIELDS)[number] {
		return FEE_NUMBER_SET.has(key);
	}

	private isFeeDateField(key: string): key is (typeof FEE_DATE_FIELDS)[number] {
		return FEE_DATE_SET.has(key);
	}

	private isFeeStringField(key: string): key is (typeof FEE_STRING_FIELDS)[number] {
		return FEE_STRING_SET.has(key);
	}

	private isEventDateField(key: string): key is (typeof EVENT_DATE_FIELDS)[number] {
		return EVENT_DATE_SET.has(key);
	}

	private isEventNumberField(key: string): key is (typeof EVENT_NUMBER_FIELDS)[number] {
		return EVENT_NUMBER_SET.has(key);
	}

	private isEventStringField(key: string): key is (typeof EVENT_STRING_FIELDS)[number] {
		return EVENT_STRING_SET.has(key);
	}

	private isResidentialBooleanField(key: string): key is (typeof RESIDENTIAL_BOOLEAN_FIELDS)[number] {
		return RESIDENTIAL_BOOLEAN_SET.has(key);
	}

	private hasAnswer(key: keyof UpdateCaseAnswers): boolean {
		const value = this.answers[key];
		if (Array.isArray(value)) {
			return value.length > 0;
		}
		return value !== undefined;
	}

	/**
	 * The conditional radio posts one input per unit option. Pull the amount
	 * belonging to the selected unit and discard the rest.
	 */
	private selectedConditionalAmount(
		item: WasteTypeItem,
		unitFieldName: 'voidCapacityUnitId' | 'maxAnnualThroughputUnitId'
	): Prisma.Decimal | null {
		const unitId = item[unitFieldName];
		if (!unitId) return null;

		const raw = item[`${unitFieldName}_${unitId}`];
		if (raw === undefined || raw === null || raw === '') return null;

		return new Prisma.Decimal(raw as string | number);
	}
}
