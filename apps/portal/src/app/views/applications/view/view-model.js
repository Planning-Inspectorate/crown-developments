import { formatDateForDisplay } from '@pins/dynamic-forms/src/lib/date-utils.js';

/**
 *
 * @param {import('./types.js').CrownDevelopmentListFields} crownDevelopment
 * @param {import('../../../config-types.js').Config} config
 * @return {import('./types.js').CrownDevelopmentListViewModel}
 */
export function crownDevelopmentToViewModel(crownDevelopment, config) {
	const fields = {
		id: crownDevelopment.id,
		reference: crownDevelopment.reference,
		applicationType: crownDevelopment.Type?.displayName,
		applicantName: crownDevelopment.ApplicantContact?.fullName,
		lpaName: crownDevelopment.Lpa?.name,
		description: crownDevelopment.description,
		stage: crownDevelopment.Stage?.displayName,
		procedure: crownDevelopment.Procedure?.displayName,
		eventDate: formatDateForDisplay(crownDevelopment.Event?.date),
		eventVenue: crownDevelopment.Event?.venue,
		eventStatementsDate: formatDateForDisplay(crownDevelopment.Event?.statementsDate),
		eventProofsOfEvidenceDate: formatDateForDisplay(crownDevelopment.Event?.proofsOfEvidenceDate),
		applicationCompleteDate: formatDateForDisplay(crownDevelopment.applicationCompleteDate),
		representationsPeriodStartDate: formatDateForDisplay(crownDevelopment.representationsPeriodStartDate),
		representationsPeriodEndDate: formatDateForDisplay(crownDevelopment.representationsPeriodEndDate),
		decisionDate: formatDateForDisplay(crownDevelopment.decisionDate),
		crownDevelopmentContactEmail: config.crownDevContactInfo?.email
	};

	if (crownDevelopment.SiteAddress) {
		fields.siteAddress = addressToViewModel(crownDevelopment.SiteAddress);
	}

	return fields;
}

/**
 * @param {import('@prisma/client').Prisma.AddressGetPayload<{}>} address
 * @returns {string}
 */
function addressToViewModel(address) {
	const fields = [address.line1, address.line2, address.townCity, address.county, address.postcode];
	return fields.filter(Boolean).join(', ');
}

/**
 * @param {string} id
 * @returns {import('./types.js').ApplicationLink[]}
 */
export function applicationLinks(id) {
	return [
		{
			href: `/applications/application-information/${id}`,
			text: 'Application Information'
		},
		{
			href: `/applications/application-information/${id}/documents`,
			text: 'Documents'
		},
		{
			// TODO: add logic to hide this when reps period is closed
			href: `/applications/application-information/${id}/have-your-say`,
			text: 'Have Your Say'
		}
	];
}
