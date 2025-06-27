import { Address } from '@planning-inspectorate/dynamic-forms/src/lib/address.js';

export interface CreateCaseAnswers {
	typeOfApplication?: string;
	lpaId?: string;
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
	applicationDescription?: string;
	expectedDateOfSubmission?: string;
}
