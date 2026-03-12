/**
 * @typedef {import('../create-a-case/types').AgentContact} AgentContact
 * @typedef {import('../create-a-case/types').ApplicantContact} ApplicantContact
 */
/**
 * A subset of Prisma input used for creating/updating contact details.
 *
 * @typedef {Pick<import('@pins/crowndev-database').Prisma.ContactCreateInput, 'firstName' | 'lastName' | 'email' | 'telephoneNumber'>} Contact
 */

/**
 * Extracts and normalizes contact fields from an applicant contact object.
 *
 * @param {ApplicantContact} contact
 * @returns {Contact}
 */
export function extractApplicantContactFields(contact) {
	return {
		firstName: contact.applicantFirstName?.trim() || null,
		lastName: contact.applicantLastName?.trim() || null,
		email: contact.applicantContactEmail?.trim() || null,
		telephoneNumber: contact.applicantContactTelephoneNumber?.trim() || null
	};
}

/**
 * Extracts and normalizes contact fields from an agent contact object.
 *
 * @param {AgentContact} contact
 * @returns {Contact}
 */
export function extractAgentContactFields(contact) {
	return {
		firstName: contact.agentFirstName?.trim() || null,
		lastName: contact.agentLastName?.trim() || null,
		email: contact.agentContactEmail?.trim() || null,
		telephoneNumber: contact.agentContactTelephoneNumber?.trim() || null
	};
}
