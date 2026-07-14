import { Prisma } from '@pins/crowndev-database/src/client/client.ts';
import { ORGANISATION_ROLES_ID } from '@pins/crowndev-database/src/seed/data-static.ts';
import {
	APPLICANT_TYPE_ID,
	S62A_STATUS_ID,
	SITE_AREA_UNIT_ID
} from '@pins/crowndev-database/src/seed/s62a/data-static.ts';
import type { YesNo } from '@pins/crowndev-lib/util/types.ts';
import { yesNoToBoolean } from '@planning-inspectorate/dynamic-forms';

export interface AddressAnswers {
	addressLine1?: string;
	addressLine2?: string;
	townCity?: string;
	county?: string;
	postcode?: string;
}

export interface ApplicantOrganisationAnswer {
	id?: string;
	organisationName: string;
	organisationAddress?: AddressAnswers;
}

export interface ApplicantContactAnswer {
	id?: string;
	applicantFirstName?: string;
	applicantLastName?: string;
	applicantContactEmail?: string;
	applicantContactTelephoneNumber?: string;
	applicantContactOrganisation?: string;
}

export interface AgentContactAnswer {
	id?: string;
	agentFirstName?: string;
	agentLastName?: string;
	agentContactEmail?: string;
	agentContactTelephoneNumber?: string;
}

export interface CreateCaseAnswers {
	// LPA Details
	lpaId: string;
	lpaFirstName?: string;
	lpaLastName?: string;
	lpaEmailAddress?: string;
	lpaPhoneNumber?: string;
	hasSecondaryLpa?: YesNo;
	secondaryLpaId?: string;
	secondaryLpaFirstName?: string;
	secondaryLpaLastName?: string;
	secondaryLpaEmailAddress?: string;
	secondaryLpaPhoneNumber?: string;

	// Agent
	hasAgent: YesNo;
	agentName?: string;
	agentAddress?: AddressAnswers;
	manageAgentContactDetails?: AgentContactAnswer[];

	// Applicant
	applicantType?: 'organisation' | 'individual';
	manageApplicantOrganisations?: ApplicantOrganisationAnswer[];
	manageApplicantContactDetails?: ApplicantContactAnswer[];

	// Site & Case Details
	applicationType: string;
	applicationClassification?: string;
	applicationPhase?: string;
	siteAddress?: AddressAnswers;
	siteEasting?: string;
	siteNorthing?: string;
	siteAreaHectares?: string;
	siteAreaSquareMetres?: string;
	developmentDescription: string;
	notificationSubmittedDate?: string;
	expectedSubmissionDate: string;
}

export interface CanonicalParty {
	role: string;
	type: 'organisation' | 'contact';
	organisation?: Prisma.OrganisationCreateInput;
	contacts?: Prisma.ContactCreateInput[];
	contact?: Prisma.ContactCreateInput;
}

export interface CasePartiesModel {
	parties: CanonicalParty[];
}

export interface CreateInputOptions {
	applicants?: Prisma.S62aToApplicantCreateWithoutS62AInput[];
}

/**
 * Mapper class that takes the raw data from the inputs and creates
 * the query needed to insert the data, creating the relevant joins
 * and nests.
 */
export class S62aCaseMapper {
	private answers: CreateCaseAnswers;
	private reference: string;
	private options: CreateInputOptions;

	constructor(answers: CreateCaseAnswers, reference: string, options: CreateInputOptions = {}) {
		this.answers = answers;
		this.reference = reference;
		this.options = options;
	}

	/**
	 * Transforms the S62A journey answers into a Prisma Create Input payload.
	 * Creates the basic object first, then runs separate functions to do
	 * the more complex joins (e.g. to organisations, lpas etc.)
	 */
	public generateCreateInput(): Prisma.S62aCaseCreateInput {
		this.validateRequiredFields();

		const input: Prisma.S62aCaseCreateInput = {
			reference: this.reference,
			description: this.answers.developmentDescription || '',
			hasAgent: yesNoToBoolean(this.answers.hasAgent),
			hasSecondaryLpa: yesNoToBoolean(this.answers.hasSecondaryLpa),

			Type: { connect: { id: this.answers.applicationType } },
			Lpa: { connect: { id: this.answers.lpaId } },

			siteEasting: this.answers.siteEasting ? parseInt(this.answers.siteEasting, 10) : undefined,
			siteNorthing: this.answers.siteNorthing ? parseInt(this.answers.siteNorthing, 10) : undefined,

			notificationSubmittedDate: this.answers.notificationSubmittedDate
				? new Date(this.answers.notificationSubmittedDate)
				: undefined,
			expectedSubmissionDate: new Date(this.answers.expectedSubmissionDate),

			S62aStatus: { connect: { id: S62A_STATUS_ID.NEW } }
		};

		this.mapLookups(input);
		this.mapLpaContacts(input);
		this.mapSiteDetails(input);
		this.mapApplicantsAndAgents(input);

		return input;
	}

	private validateRequiredFields(): void {
		if (!this.answers.applicationType) {
			throw new Error('Cannot create S62aCase: missing required applicationType');
		}
		if (!this.answers.lpaId) {
			throw new Error('Cannot create S62aCase: missing required lpaId');
		}
	}

	private mapLookups(input: Prisma.S62aCaseCreateInput): void {
		if (this.answers.applicationClassification) {
			input.Classification = { connect: { id: this.answers.applicationClassification } };
		}

		if (this.answers.applicationPhase) {
			input.ApplicationPhase = { connect: { id: this.answers.applicationPhase } };
		}
	}

	private mapLpaContacts(input: Prisma.S62aCaseCreateInput): void {
		if (this.answers.lpaFirstName) {
			input.LpaContact = {
				create: {
					firstName: this.answers.lpaFirstName || undefined,
					lastName: this.answers.lpaLastName || undefined,
					email: this.answers.lpaEmailAddress || undefined,
					telephoneNumber: this.answers.lpaPhoneNumber || undefined
				}
			};
		}

		if (yesNoToBoolean(this.answers.hasSecondaryLpa) && this.answers.secondaryLpaId) {
			input.SecondaryLpa = { connect: { id: this.answers.secondaryLpaId } };

			if (this.answers.secondaryLpaFirstName) {
				input.SecondaryLpaContact = {
					create: {
						firstName: this.answers.secondaryLpaFirstName || undefined,
						lastName: this.answers.secondaryLpaLastName || undefined,
						email: this.answers.secondaryLpaEmailAddress || undefined,
						telephoneNumber: this.answers.secondaryLpaPhoneNumber || undefined
					}
				};
			}
		}
	}

	private mapSiteDetails(input: Prisma.S62aCaseCreateInput): void {
		if (this.hasAnswer('siteAddress') && this.answers.siteAddress) {
			input.SiteAddress = {
				create: this.toAddressInput(this.answers.siteAddress)
			};
		}

		if (this.answers.siteAreaHectares) {
			input.siteAreaInSquareMetres = new Prisma.Decimal(this.answers.siteAreaHectares).times(10000);
			input.SiteAreaOriginalUnit = { connect: { id: SITE_AREA_UNIT_ID.HECTARES } };
		} else if (this.answers.siteAreaSquareMetres) {
			input.siteAreaInSquareMetres = new Prisma.Decimal(this.answers.siteAreaSquareMetres);
			input.SiteAreaOriginalUnit = { connect: { id: SITE_AREA_UNIT_ID.METRES_SQUARED } };
		}
	}

	private mapApplicantsAndAgents(input: Prisma.S62aCaseCreateInput): void {
		if (this.options.applicants) {
			input.S62aToApplicants = { create: this.options.applicants };
			return;
		}

		const model = this.extractCasePartiesModel();
		const applicantsCreate = this.toNestedApplicantCreates(model);

		if (applicantsCreate.length > 0) {
			input.S62aToApplicants = { create: applicantsCreate };
		}
	}

	private extractCasePartiesModel(): CasePartiesModel {
		const parties = [...this.extractApplicantParties()];
		const agent = this.extractAgentParty();

		if (agent) {
			parties.push(agent);
		}

		return { parties };
	}

	private validateOrphanedContacts(): void {
		if (this.answers.applicantType !== APPLICANT_TYPE_ID.ORGANISATION) return;
		if (!this.answers.manageApplicantOrganisations || !this.answers.manageApplicantContactDetails) return;

		this.answers.manageApplicantContactDetails.forEach((contact) => {
			const selector = contact.applicantContactOrganisation;
			if (!selector) throw new Error('Unable to match applicant contact to organisation - no valid selector');

			if (this.answers.manageApplicantOrganisations?.some((org) => org.id && org.id === selector)) return;

			throw new Error(`Found an orphaned contact with selector "${selector}": ${contact.applicantContactEmail}`);
		});
	}

	private extractApplicantParties(): CanonicalParty[] {
		if (!this.answers.applicantType) return [];

		if (this.answers.applicantType === APPLICANT_TYPE_ID.ORGANISATION && this.answers.manageApplicantOrganisations) {
			this.validateOrphanedContacts();

			return this.answers.manageApplicantOrganisations.map((org) => {
				const organisationCreate: Prisma.OrganisationCreateInput = {
					name: org.organisationName.trim(),
					Address:
						org.organisationAddress && Object.values(org.organisationAddress).some((v) => !!v)
							? { create: this.toAddressInput(org.organisationAddress) }
							: undefined
				};

				let contacts: Prisma.ContactCreateInput[] = [];
				if (this.answers.manageApplicantContactDetails) {
					const linkedContacts = this.answers.manageApplicantContactDetails.filter(
						(contact) => contact.applicantContactOrganisation === org.id
					);
					contacts = linkedContacts.map((contact) => this.extractApplicantContactFields(contact));
				}

				return {
					role: ORGANISATION_ROLES_ID.APPLICANT,
					type: APPLICANT_TYPE_ID.ORGANISATION,
					organisation: organisationCreate,
					contacts
				};
			});
		}

		if (this.answers.applicantType === 'individual' && this.answers.manageApplicantContactDetails) {
			return this.answers.manageApplicantContactDetails.map((contact) => ({
				role: ORGANISATION_ROLES_ID.APPLICANT,
				type: 'contact',
				contact: this.extractApplicantContactFields(contact)
			}));
		}

		return [];
	}

	private extractAgentParty(): CanonicalParty | null {
		if (!this.hasAnswer('hasAgent') || !yesNoToBoolean(this.answers.hasAgent)) {
			return null;
		}

		if (!this.answers.manageAgentContactDetails) {
			throw new Error('Agent contacts are required when the case has an agent');
		}

		if (!this.answers.agentName) {
			throw new Error('Agent name is required when the case has an agent');
		}

		const contacts = this.answers.manageAgentContactDetails.map((contact) => this.extractAgentContactFields(contact));

		return {
			role: ORGANISATION_ROLES_ID.AGENT,
			type: APPLICANT_TYPE_ID.ORGANISATION,
			organisation: {
				name: this.answers.agentName.trim(),
				Address:
					this.answers.agentAddress && Object.values(this.answers.agentAddress).some((v) => !!v)
						? { create: this.toAddressInput(this.answers.agentAddress) }
						: undefined
			},
			contacts
		};
	}

	private toNestedApplicantCreates(model: CasePartiesModel): Prisma.S62aToApplicantCreateWithoutS62AInput[] {
		const creates: Prisma.S62aToApplicantCreateWithoutS62AInput[] = [];

		for (const party of model.parties) {
			if (party.type === APPLICANT_TYPE_ID.ORGANISATION && party.organisation) {
				const organisationCreate: Prisma.OrganisationCreateInput = { ...party.organisation };

				if (party.contacts && party.contacts.length > 0) {
					organisationCreate.OrganisationToContact = {
						create: party.contacts.map((contact) => ({
							Contact: { create: contact }
						}))
					};
				}

				creates.push({
					Role: { connect: { id: party.role } },
					Organisation: { create: organisationCreate }
				});
			} else if (party.type === 'contact' && party.contact) {
				creates.push({
					Role: { connect: { id: party.role } },
					Contact: { create: party.contact }
				});
			}
		}

		return creates;
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

	private toAddressInput(address: AddressAnswers) {
		return {
			line1: address.addressLine1,
			line2: address.addressLine2,
			townCity: address.townCity,
			county: address.county,
			postcode: address.postcode
		};
	}

	private hasAnswer(key: keyof CreateCaseAnswers): boolean {
		const value = this.answers[key];
		return Array.isArray(value) ? value.length > 0 : Boolean(value);
	}
}
