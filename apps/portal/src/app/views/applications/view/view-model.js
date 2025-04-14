import { formatDateForDisplay, isNowAfterStartDate, nowIsWithinRange } from '@pins/dynamic-forms/src/lib/date-utils.js';
import {
	APPLICATION_PROCEDURE_ID,
	REPRESENTATION_SUBMITTED_FOR_ID,
	REPRESENTED_TYPE_ID
} from '@pins/crowndev-database/src/seed/data-static.js';
import { addressToViewModel } from '@pins/dynamic-forms/src/lib/address-utils.js';
import { nameToViewModel } from '@pins/crowndev-lib/util/name.js';

/**
 *
 * @param {import('./types.js').CrownDevelopmentListFields} crownDevelopment
 * @param {string} contactEmail
 * @return {import('./types.js').CrownDevelopmentListViewModel}
 */
export function crownDevelopmentToViewModel(crownDevelopment, contactEmail) {
	const fields = {
		id: crownDevelopment.id,
		reference: crownDevelopment.reference,
		applicationType: crownDevelopment.Type?.displayName,
		applicantName:
			crownDevelopment.ApplicantContact?.orgName ||
			nameToViewModel(crownDevelopment.ApplicantContact?.firstName, crownDevelopment.ApplicantContact?.lastName),
		lpaName: crownDevelopment.Lpa?.name,
		description: crownDevelopment.description,
		stage: crownDevelopment.Stage?.displayName,
		procedure: crownDevelopment.Procedure?.displayName,
		applicationAcceptedDate: formatDateForDisplay(crownDevelopment.applicationAcceptedDate),
		representationsPeriodStartDate: formatDateForDisplay(crownDevelopment.representationsPeriodStartDate),
		representationsPeriodEndDate: formatDateForDisplay(crownDevelopment.representationsPeriodEndDate),
		representationsPeriodStartDateTime: formatDateForDisplay(crownDevelopment.representationsPeriodStartDate, {
			format: 'd MMM yyyy HH:mm'
		}),
		representationsPeriodEndDateTime: formatDateForDisplay(crownDevelopment.representationsPeriodEndDate, {
			format: 'd MMM yyyy HH:mm'
		}),
		decisionDate: formatDateForDisplay(crownDevelopment.decisionDate),
		decisionOutcome: crownDevelopment.DecisionOutcome?.displayName,
		crownDevelopmentContactEmail: contactEmail
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
	if (crownDevelopment.siteNorthing && crownDevelopment.siteEasting) {
		fields.siteCoordinates = {
			northing: crownDevelopment.siteNorthing.toString().padStart(6, '0'),
			easting: crownDevelopment.siteEasting.toString().padStart(6, '0')
		};
	}

	return fields;
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
		representationReference: representation.reference,
		representationTitle: representationTitle(representation),
		representationComment: representation.commentRedacted || representation.comment,
		representationCommentIsRedacted: Boolean(representation.commentRedacted),
		representationCategory: representation.Category?.displayName,
		dateRepresentationSubmitted: formatDateForDisplay(representation.submittedDate),
		representationContainsAttachments: representation.containsAttachments
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
