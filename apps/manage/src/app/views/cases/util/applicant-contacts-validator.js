import CustomManageListValidator from '@pins/crowndev-lib/forms/custom-components/manage-list/validator.js';
import CrossQuestionValidator from '@pins/crowndev-lib/validators/cross-question-validator.js';

/**
 * @typedef {import('@planning-inspectorate/dynamic-forms/src/validator/base-validator')} BaseValidator
 */

/**
 * Returns the applicant contacts validator array for use in manage applicant contacts questions.
 * @param {boolean} hasAgentAnswer
 * @returns {(CustomManageListValidator|CrossQuestionValidator)[]}
 */
export function getApplicantContactsValidator(hasAgentAnswer) {
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
					validationFunction: (contacts, applicants) => {
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
								throw new Error(`You must add a contact for ${organisation.organisationName}`);
							}
						});
						return true;
					}
				})
			];
}
