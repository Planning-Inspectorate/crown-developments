export interface CreateCaseAnswers {
	typeOfApplication?: string;
	lpaContactName?: string;
	lpaContactAddress?: Address;
	lpaContactEmail?: string;
	lpaContactTelephoneNumber?: string;
	applicantName?: string;
	applicantAddress?: Address;
	applicantEmail?: string;
	applicantTelephoneNumber?: string;
	hasAgent?: boolean;
	agentName?: string;
	agentAddress?: Address;
	agentEmail?: string;
	agentTelephoneNumber?: string;
	sitePostCode?: string;
	siteNorthing?: string;
	siteEasting?: string;
	siteArea?: string;
	projectName?: string;
	projectDescription?: string;
	expectedDateOfSubmission?: string;
}

export interface Address {
	addressLine1?: string;
	addressLine2?: string;
	townCity?: string;
	county?: string;
	postcode?: string;
}
