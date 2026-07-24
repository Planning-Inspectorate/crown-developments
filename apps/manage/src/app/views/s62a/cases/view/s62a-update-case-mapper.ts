import { Prisma } from '@pins/crowndev-database/src/client/client.ts';
import { ORGANISATION_ROLES_ID } from '@pins/crowndev-database/src/seed/data-static.ts';
import { APPLICANT_TYPE_ID, SITE_AREA_UNIT_ID } from '@pins/crowndev-database/src/seed/s62a/data-static.ts';
import { viewModelToAddressUpdateInput } from '@pins/crowndev-lib/util/address.ts';
import type { YesNo } from '@pins/crowndev-lib/util/types.ts';
import { type Address, yesNoToBoolean } from '@planning-inspectorate/dynamic-forms';
import {
	S62A_DATE_FIELDS,
	FEE_BOOLEAN_FIELDS,
	FEE_NUMBER_FIELDS,
	FEE_DATE_FIELDS,
	FEE_STRING_FIELDS,
	type S62aCaseViewModel
} from './view-model.ts';
import {
	type AgentContactAnswer,
	type ApplicantOrganisationAnswer,
	type ApplicantContactAnswer
} from '../util/party-types.ts';
import { addBusinessDays } from 'date-fns';
import { optionalWhere } from '@pins/crowndev-lib/util/database.ts';

const DATE_FIELDS_SET = new Set<string>(S62A_DATE_FIELDS);
const FEE_BOOLEAN_SET = new Set<string>(FEE_BOOLEAN_FIELDS);
const FEE_NUMBER_SET = new Set<string>(FEE_NUMBER_FIELDS);
const FEE_DATE_SET = new Set<string>(FEE_DATE_FIELDS);
const FEE_STRING_SET = new Set<string>(FEE_STRING_FIELDS);

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
	}

	/**
	 * Maps fields to do with the location (e.g. site northing, site area...)
	 */
	private mapLocationScalars(input: Prisma.S62aCaseUpdateInput): void {
		const ans = this.answers;

		if (this.hasAnswer('siteIsVisibleFromPublicLand')) {
			input.siteIsVisibleFromPublicLand = ans.siteIsVisibleFromPublicLand
				? yesNoToBoolean(ans.siteIsVisibleFromPublicLand)
				: null;
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
	}

	/**
	 * Handles the semi-unique case of addresses being an object with unpopulated / populated keys
	 */
	private mapAddress(input: Prisma.S62aCaseUpdateInput): void {
		if (this.hasAnswer('siteAddress')) {
			const addressData = viewModelToAddressUpdateInput(this.answers.siteAddress!);
			input.SiteAddress = { upsert: { create: addressData, update: addressData } };
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
			const addressData = this.answers.agentAddress ? this.toAddressInput(this.answers.agentAddress) : null;
			updateOperations.push({
				where: { id: agentRelId },
				data: {
					Organisation: {
						update: {
							name: this.answers.agentName !== undefined ? this.answers.agentName : undefined,
							Address: addressData
								? {
										upsert: {
											where: optionalWhere(this.existingCase?.agentOrganisationAddressId),
											create: addressData,
											update: addressData
										}
									}
								: undefined
						}
					}
				}
			});
		} else if (this.answers.agentName) {
			createOperations.push({
				Role: { connect: { id: ORGANISATION_ROLES_ID.AGENT } },
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
					Role: { connect: { id: ORGANISATION_ROLES_ID.APPLICANT } },
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
					Role: { connect: { id: ORGANISATION_ROLES_ID.APPLICANT } },
					Contact: { create: this.extractApplicantContactFields(contact) }
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

	private hasAnswer(key: keyof UpdateCaseAnswers): boolean {
		const value = this.answers[key];
		if (Array.isArray(value)) {
			return value.length > 0;
		}
		return value !== undefined;
	}
}
