import { PRE_APPLICATION_OR_APPLICATION_ID } from '@pins/crowndev-database/src/seed/s62a/data-static.ts';
import type { Prisma } from '@pins/crowndev-database/src/client/client.ts';
import CrossQuestionValidator from '@pins/crowndev-lib/validators/cross-question-validator.js';

export const QUESTION_TEXT = {
	[PRE_APPLICATION_OR_APPLICATION_ID.PRE_APPLICATION]: {
		applicationType: 'What type of application is this pre-application advice for?',
		localPlanningAuthority: 'Which local planning authority is this pre-application advice related to?',
		hasSecondaryLpa: 'Does this pre-application advice have a secondary local planning authority?',
		secondaryLocalPlanningAuthority:
			'Which secondary local planning authority is this pre-application advice related to?',
		developmentDescription: undefined,
		expectedSubmissionDate: 'When is the pre-application advice expected to be submitted?'
	},
	[PRE_APPLICATION_OR_APPLICATION_ID.APPLICATION]: {
		applicationType: 'What type of application is it?',
		localPlanningAuthority: 'Which local planning authority is this application related to?',
		hasSecondaryLpa: 'Does this application have a secondary local planning authority?',
		secondaryLocalPlanningAuthority: 'Which secondary local planning authority is this application related to?',
		developmentDescription: 'This will be published on the website.',
		expectedSubmissionDate: 'When is the application expected to be submitted?'
	}
};

export type AppType = (typeof PRE_APPLICATION_OR_APPLICATION_ID)[keyof typeof PRE_APPLICATION_OR_APPLICATION_ID];

/**
 * Checks to make sure answer is one of the two app types, for typescript
 */
export const isApplicationType = (answer: unknown): answer is AppType => {
	return (
		answer === PRE_APPLICATION_OR_APPLICATION_ID.PRE_APPLICATION ||
		answer === PRE_APPLICATION_OR_APPLICATION_ID.APPLICATION
	);
};

/**
 * Formats LPA list with null value first and unsorted LPAs as received
 * from file, ready for use as an options array.
 */
export const formatLpaOptions = (lpas: Prisma.LpaCreateInput[]) => {
	const lpaOptions = [{ text: '', value: '' }, ...lpas.map((t) => ({ text: t.name, value: t.id }))];
	return lpaOptions;
};

export interface ApplicantContact {
	applicantContactOrganisation?: string;
}

export interface ApplicantOrganisation {
	id?: string;
	organisationName?: string;
}

/**
 * Returns the applicant contacts validator array for use in manage applicant contacts questions.
 *
 * If they have an agent, or if they are an individual rather than an org, then we don't
 * want any validation.
 */
export const getApplicantContactsValidator = (hasAgentAnswer: boolean, isIndividual: boolean) => {
	return hasAgentAnswer || isIndividual
		? []
		: [
				new CrossQuestionValidator({
					dependencyFieldName: 'manageApplicantOrganisations',
					validationFunction: (contacts: ApplicantContact[], applicants: ApplicantOrganisation[]) => {
						if (!Array.isArray(contacts) || !Array.isArray(applicants)) return true;

						const contactOrgIds = contacts.map((contact) => contact.applicantContactOrganisation);
						const applicantOrgIds = applicants.map((org) => org.id);

						const allContactsHaveValidOrg = contactOrgIds.every((orgId) => applicantOrgIds.includes(orgId));
						if (!allContactsHaveValidOrg) {
							throw new Error('All applicant contacts must be associated with an applicant organisation');
						}

						applicants.forEach((organisation) => {
							const hasMatchingContact = contacts.some(
								(contact) => contact.applicantContactOrganisation === organisation.id
							);
							if (!hasMatchingContact) {
								throw new Error(`You must add a contact for ${organisation.organisationName || 'this organisation'}`);
							}
						});

						return true;
					}
				})
			];
};
