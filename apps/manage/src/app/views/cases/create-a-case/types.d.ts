import { Address } from '@planning-inspectorate/dynamic-forms/src/lib/address.js';
import { YesNo } from '@pins/crowndev-lib/types/crown/types';

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
	hasSecondaryLpa?: YesNo;
	secondaryLpaId?: string;
	applicantName?: string;
	applicantAddress?: Address;
	applicantEmail?: string;
	applicantTelephoneNumber?: string;
	hasAgent?: YesNo;
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
	containsDistressingContent?: YesNo;
}
