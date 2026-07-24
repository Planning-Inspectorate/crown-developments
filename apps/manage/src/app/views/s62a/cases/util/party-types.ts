import type { Prisma } from '@pins/crowndev-database/src/client/client.ts';
import type { Address } from '@planning-inspectorate/dynamic-forms';

export interface ApplicantOrganisationAnswer {
	id?: string;
	organisationRelationId?: string;
	organisationAddressId?: string;
	organisationName: string;
	organisationAddress?: Address;
}

export interface ApplicantContactAnswer {
	id?: string;
	applicantRelationId?: string;
	organisationToContactRelationId?: string;
	applicantFirstName?: string;
	applicantLastName?: string;
	applicantContactEmail?: string;
	applicantContactTelephoneNumber?: string;
	applicantContactOrganisation?: string;
}

export interface AgentContactAnswer {
	id?: string;
	organisationToContactRelationId?: string;
	agentFirstName?: string;
	agentLastName?: string;
	agentContactEmail?: string;
	agentContactTelephoneNumber?: string;
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
