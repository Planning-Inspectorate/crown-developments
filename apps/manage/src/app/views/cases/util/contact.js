/**
 * @typedef {import('../create-a-case/types').ApplicantContact} ApplicantContact
 */

/**
 * Extracts and normalizes contact fields from a contact object.
 * @param {ApplicantContact} contact
 * @returns {{firstName: string|null, lastName: string|null, email: string|null, telephoneNumber: string|null}}
 */
export function extractContactFields(contact) {
	return {
		firstName: contact.applicantFirstName?.trim() || null,
		lastName: contact.applicantLastName?.trim() || null,
		email: contact.applicantContactEmail?.trim() || null,
		telephoneNumber: contact.applicantContactTelephoneNumber?.trim() || null
	};
}
