import CustomManageListValidator from '@pins/crowndev-lib/forms/custom-components/manage-list/validator.js';
import { CrossQuestionValidator } from '@planning-inspectorate/dynamic-forms';

export interface ApplicantContact {
	applicantContactOrganisation?: string;
}

export interface ApplicantOrganisation {
	id?: string;
	organisationName?: string;
}

/**
 * Shared validation function for applicant contacts.
 * Validates that all contacts have a valid organisation and each organisation has at least one contact.
 */
export function applicantContactsValidationFn(contacts: unknown, applicants: unknown): boolean {
	if (!Array.isArray(contacts) || !Array.isArray(applicants)) return true;

	const typedContacts = contacts as ApplicantContact[];
	const typedApplicants = applicants as ApplicantOrganisation[];

	const contactOrgIds = typedContacts.map((contact) => contact.applicantContactOrganisation);
	const applicantOrgIds = typedApplicants.map((org) => org.id);
	const allContactsHaveValidOrg = contactOrgIds.every(
		(orgId) => typeof orgId === 'string' && orgId.length > 0 && applicantOrgIds.includes(orgId)
	);
	if (!allContactsHaveValidOrg) {
		throw new Error('All applicant contacts must be associated with an applicant organisation');
	}
	typedApplicants.forEach((organisation) => {
		const hasMatchingContact = typedContacts.some(
			(contact) => contact.applicantContactOrganisation === organisation.id
		);
		if (!hasMatchingContact) {
			throw new Error(`You must add a contact for ${organisation.organisationName || 'this organisation'}`);
		}
	});
	return true;
}

/**
 * Returns the applicant contacts validator array for use in manage applicant contacts questions.
 */
export function getApplicantContactsValidator(
	hasAgentAnswer: boolean
): (CustomManageListValidator | CrossQuestionValidator)[] {
	return hasAgentAnswer
		? []
		: [
				new CustomManageListValidator({
					minimumAnswers: 1,
					errorMessages: {
						minimumAnswers: `At least one contact is required`
					}
				}),
				new CrossQuestionValidator({
					dependencyFieldName: 'manageApplicantDetails',
					validationFunction: applicantContactsValidationFn
				})
			];
}
