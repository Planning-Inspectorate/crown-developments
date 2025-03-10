import { formatDateForDisplay, isNowAfterStartDate, nowIsWithinRange } from '@pins/dynamic-forms/src/lib/date-utils.js';
import {
	APPLICATION_PROCEDURE_ID,
	REPRESENTATION_SUBMITTED_FOR_ID,
	REPRESENTED_TYPE_ID
} from '@pins/crowndev-database/src/seed/data-static.js';

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
		applicationCompleteDate: formatDateForDisplay(crownDevelopment.applicationCompleteDate),
		representationsPeriodStartDate: formatDateForDisplay(crownDevelopment.representationsPeriodStartDate),
		representationsPeriodEndDate: formatDateForDisplay(crownDevelopment.representationsPeriodEndDate),
		decisionDate: formatDateForDisplay(crownDevelopment.decisionDate),
		crownDevelopmentContactEmail: config.crownDevContactInfo?.email
	};

	if (isInquiry(crownDevelopment.procedureId)) {
		fields.isInquiry = true;
		fields.inquiryDate = formatDateForDisplay(crownDevelopment.Event?.date);
		fields.inquiryVenue = crownDevelopment.Event?.venue;
		fields.inquiryStatementsDate = formatDateForDisplay(crownDevelopment.Event?.statementsDate);
		fields.inquiryProofsOfEvidenceDate = formatDateForDisplay(crownDevelopment.Event?.proofsOfEvidenceDate);
	} else if (isHearing(crownDevelopment.procedureId)) {
		fields.isHearing = true;
		fields.hearingDate = formatDateForDisplay(crownDevelopment.Event?.date);
		fields.hearingVenue = crownDevelopment.Event?.venue;
	}

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
 * @param {string|null} procedureId
 * @returns {boolean}
 */
function isInquiry(procedureId) {
	return procedureId === APPLICATION_PROCEDURE_ID.INQUIRY;
}

/**
 * @param {string|null} procedureId
 * @returns {boolean}
 */
function isHearing(procedureId) {
	return procedureId === APPLICATION_PROCEDURE_ID.HEARING;
}

/**
 * @typedef {{start: Date, end: Date}} HaveYourSayPeriod
 */

/**
 * @param {string} id
 * @param { HaveYourSayPeriod } haveYourSayPeriod
 * @param { Date } representationsPublishDate
 * @returns {import('./types.js').ApplicationLink[]}
 */
export function applicationLinks(id, haveYourSayPeriod, representationsPublishDate) {
	const links = [
		{
			href: `/applications/${id}/application-information`,
			text: 'Application Information'
		},
		{
			href: `/applications/${id}/documents`,
			text: 'Documents'
		}
	];

	if (nowIsWithinRange(haveYourSayPeriod?.start, haveYourSayPeriod?.end)) {
		links.push({
			href: `/applications/${id}/have-your-say`,
			text: 'Have your say'
		});
	}

	if (isNowAfterStartDate(representationsPublishDate)) {
		links.push({
			href: `/applications/${id}/written-representations`,
			text: 'Written representations'
		});
	}
	return links;
}

/**
 * @param {string} id
 * @returns {import('./types.js').ApplicationLink}
 */
export function documentsLink(id) {
	return {
		href: `/applications/${id}/documents`,
		text: 'Documents'
	};
}

/**
 * @param {import('./types.js').RepresentationsListFields} representation
 * @return {import('./types.js').RepresentationViewModel}
 */
export function representationToViewModel(representation) {
	return {
		representationTitle: representationTitle(representation),
		representationComment: representation.commentRedacted || representation.comment,
		representationReference: representation.reference,
		representationSubmittedFor: representation.SubmittedFor?.displayName,
		dateRepresentationSubmitted: formatDateForDisplay(representation.submittedDate),
		representationContainsAttachments: representation.containsAttachments,
		representationCategory: representation.Category?.displayName
	};
}

/**
 * @param {import('./types.js').RepresentationsListFields} representation
 * @return {string | undefined}
 */
export function representationTitle(representation) {
	const getDisplayName = (contact, placeholder) => (contact?.isAdult ? contact.fullName : placeholder);

	const getOnBehalfTitle = (agent, organisation, represented) =>
		organisation ? `${agent} (${organisation}) on behalf of ${represented}` : `${agent} on behalf of ${represented}`;

	const { submittedForId, representedTypeId, submittedByAgentOrgName, SubmittedByContact, RepresentedContact } =
		representation;

	if (submittedForId === REPRESENTATION_SUBMITTED_FOR_ID.MYSELF) {
		return getDisplayName(SubmittedByContact, 'A member of the public');
	}

	if (submittedForId === REPRESENTATION_SUBMITTED_FOR_ID.ON_BEHALF_OF) {
		const agentName = getDisplayName(SubmittedByContact, 'A representative');
		const representedName = getDisplayName(RepresentedContact, 'A member of the public');

		return representedTypeId === REPRESENTED_TYPE_ID.ORGANISATION
			? `${agentName} on behalf of ${representedName}`
			: getOnBehalfTitle(agentName, submittedByAgentOrgName, representedName);
	}
}
