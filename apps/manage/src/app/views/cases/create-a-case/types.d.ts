import type { Address } from '@planning-inspectorate/dynamic-forms/src/lib/address.js';

export interface ApplicantContact {
	applicantContactOrganisation: string;
	applicantFirstName: string;
	applicantLastName: string;
	applicantContactEmail: string;
	applicantContactTelephoneNumber?: string;
}

export interface ApplicantOrganisation {
	id: string;
	organisationName: string;
	organisationAddress?: Address;
}

export interface CreateCaseAnswers {
	typeOfApplication?: string;
	lpaId?: string;
	hasSecondaryLpa?: boolean;
	secondaryLpaId?: string;
	applicantName?: string;
	applicantAddress?: Address;
	applicantEmail?: string;
	applicantTelephoneNumber?: string;
	hasAgent?: boolean;
	agentName?: string;
	agentAddress?: Address;
	agentEmail?: string;
	agentTelephoneNumber?: string;
	siteAddress?: Address;
	siteNorthing?: string;
	siteEasting?: string;
	siteArea?: string;
	developmentDescription?: string;
	expectedDateOfSubmission?: string;
	// TODO make this required when we fully switch over to V2
	manageApplicantDetails?: ApplicantOrganisation[];
	manageApplicantContactDetails?: ApplicantContact[];
}
