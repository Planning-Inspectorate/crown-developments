import {
	formatDateForDisplay,
	isNowAfterStartDate,
	nowIsWithinRange
} from '@planning-inspectorate/dynamic-forms/src/lib/date-utils.js';
import {
	APPLICATION_PROCEDURE_ID,
	REPRESENTATION_STATUS_ID,
	REPRESENTATION_SUBMITTED_FOR_ID,
	REPRESENTED_TYPE_ID
} from '@pins/crowndev-database/src/seed/data-static.js';
import { addressToViewModel } from '@planning-inspectorate/dynamic-forms/src/lib/address-utils.js';
import { nameToViewModel } from '@pins/crowndev-lib/util/name.js';
import {
	shouldTruncateComment,
	truncateComment,
	truncatedReadMoreCommentLink
} from '@pins/crowndev-lib/util/questions.js';

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
		applicantName: crownDevelopment.ApplicantContact?.orgName,
		lpaName: crownDevelopment.Lpa?.name,
		description: crownDevelopment.description,
		stage: crownDevelopment.Stage?.displayName,
		procedure: crownDevelopment.Procedure?.displayName,
		applicationAcceptedDate: formatDateForDisplay(crownDevelopment.applicationAcceptedDate, { format: 'd MMMM yyyy' }),
		representationsPeriodStartDate: formatDateForDisplay(crownDevelopment.representationsPeriodStartDate, {
			format: 'd MMMM yyyy'
		}),
		representationsPeriodEndDate: formatDateForDisplay(crownDevelopment.representationsPeriodEndDate, {
			format: 'd MMMM yyyy'
		}),
		representationsPeriodStartDateTime: formatDateForDisplay(crownDevelopment.representationsPeriodStartDate, {
			format: `d MMMM yyyy 'at' h:mmaaa`
		}),
		representationsPeriodEndDateTime: formatDateForDisplay(crownDevelopment.representationsPeriodEndDate, {
			format: `d MMMM yyyy 'at' h:mmaaa`
		}),
		representationsPublishDate: formatDateForDisplay(crownDevelopment.representationsPublishDate, {
			format: 'd MMMM yyyy'
		}),
		decisionDate: formatDateForDisplay(crownDevelopment.decisionDate, { format: 'd MMMM yyyy' }),
		decisionOutcome: crownDevelopment.DecisionOutcome?.displayName,
		crownDevelopmentContactEmail: contactEmail,
		containsDistressingContent: crownDevelopment.containsDistressingContent
	};

	const withdrawnDateFormatted = formatDateForDisplay(crownDevelopment.withdrawnDate, { format: 'd MMMM yyyy' });
	if (withdrawnDateFormatted) {
		fields.withdrawnDate = withdrawnDateFormatted;
	}

	if (crownDevelopment.SecondaryLpa && crownDevelopment.SecondaryLpa.name) {
		fields.SecondaryLpa = crownDevelopment.SecondaryLpa;
	}

	if (isInquiry(crownDevelopment.procedureId)) {
		fields.isInquiry = true;
		fields.inquiryDate = formatDateForDisplay(crownDevelopment.Event?.date, { format: 'd MMMM yyyy' });
		fields.inquiryVenue = crownDevelopment.Event?.venue;
		fields.inquiryStatementsDate = formatDateForDisplay(crownDevelopment.Event?.statementsDate, {
			format: 'd MMMM yyyy'
		});
		fields.inquiryProofsOfEvidenceDate = formatDateForDisplay(crownDevelopment.Event?.proofsOfEvidenceDate, {
			format: 'd MMMM yyyy'
		});
	} else if (isHearing(crownDevelopment.procedureId)) {
		fields.isHearing = true;
		fields.hearingDate = formatDateForDisplay(crownDevelopment.Event?.date, { format: 'd MMMM yyyy' });
		fields.hearingVenue = crownDevelopment.Event?.venue;
	}

	if (crownDevelopment.SiteAddress) {
		fields.siteAddress = addressToViewModel(crownDevelopment.SiteAddress);
	}
	if (crownDevelopment.siteEasting && crownDevelopment.siteNorthing) {
		fields.siteCoordinates = {
			easting: crownDevelopment.siteEasting.toString().padStart(6, '0'),
			northing: crownDevelopment.siteNorthing.toString().padStart(6, '0')
		};
	}
	if (crownDevelopment.SubType) {
		fields.applicationSubType = crownDevelopment.SubType?.displayName;
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
 * Build the application navigation links for the various application view pages.
 *
 * This function accepts two different calling styles used in the codebase:
 *  - applicationLinks(id, haveYourSayPeriod, representationsPublishDate, displayApplicationUpdates, restrictLinks)
 *    where the 5th argument is a boolean that forces link restriction.
 *  - applicationLinks(id, haveYourSayPeriod, representationsPublishDate, displayApplicationUpdates, applicationStatus, restrictLinks)
 *    where the 5th argument is the applicationStatus string (e.g. 'active'|'withdrawn'|'expired') and the 6th is an optional restrictLinks boolean.
 *
 * @param { string } id
 * @param { HaveYourSayPeriod } haveYourSayPeriod
 * @param { Date } representationsPublishDate
 * @param { boolean } displayApplicationUpdates
 * @param { string|undefined } applicationStatus - Either the applicationStatus string (e.g. 'active') or `undefined`.
 * @param { boolean|undefined } restrictLinks - A flag to restrict links, default is `true`.
 * @returns {import('./types.js').ApplicationLink[]}
 */
export function applicationLinks(
	id,
	haveYourSayPeriod,
	representationsPublishDate,
	displayApplicationUpdates,
	applicationStatus = undefined,
	restrictLinks = true
) {
	const links = [
		{
			href: `/applications/${id}/application-information`,
			text: 'Application information'
		}
	];
	if (restrictLinks !== false) {
		const isWithdrawn = applicationStatus === 'withdrawn' || applicationStatus === 'expired';
		const isExpired = applicationStatus === 'expired';

		if (!(isWithdrawn && isExpired)) {
			links.push({
				href: `/applications/${id}/documents`,
				text: 'Documents'
			});
			if (!isWithdrawn && nowIsWithinRange(haveYourSayPeriod?.start, haveYourSayPeriod?.end)) {
				links.push({
					href: `/applications/${id}/have-your-say`,
					text: 'Have your say'
				});
			}
			if (displayApplicationUpdates) {
				links.push({
					href: `/applications/${id}/application-updates`,
					text: 'Application updates'
				});
			}
			if (isNowAfterStartDate(representationsPublishDate)) {
				links.push({
					href: `/applications/${id}/written-representations`,
					text: 'Written representations'
				});
			}
		}
	}
	return links;
}

/**
 * @param {import('./types.js').RepresentationsListFields} representation
 * @param {boolean} truncateCommentForView
 * @return {import('./types.js').RepresentationViewModel}
 */
export function representationToViewModel(representation, truncateCommentForView = false) {
	const representationComment = representation.commentRedacted || representation.comment;
	return {
		representationReference: representation.reference,
		representationTitle: representationTitle(representation),
		representationComment: truncateCommentForView ? truncateComment(representationComment) : representationComment,
		representationCommentIsRedacted: Boolean(representation.commentRedacted),
		representationCategory: representation.Category?.displayName,
		dateRepresentationSubmitted: formatDateForDisplay(representation.submittedDate),
		representationContainsAttachments: representation.containsAttachments,
		hasAttachments:
			representation.Attachments?.some((doc) => doc.statusId === REPRESENTATION_STATUS_ID.ACCEPTED) &&
			representation.containsAttachments,
		...(truncateCommentForView &&
			shouldTruncateComment(representationComment) && {
				truncatedReadMoreLink: truncatedReadMoreCommentLink(`written-representations/${representation.reference}`)
			})
	};
}

/**
 * @param {import('./types.js').RepresentationsListFields} representation
 * @return {string | undefined}
 */
export function representationTitle(representation) {
	const getDisplayName = (contact) => contact.orgName ?? nameToViewModel(contact.firstName, contact.lastName);

	const getOnBehalfTitle = (agent, organisation, represented) =>
		organisation ? `${agent} (${organisation}) on behalf of ${represented}` : `${agent} on behalf of ${represented}`;

	const { submittedForId, representedTypeId, submittedByAgentOrgName, SubmittedByContact, RepresentedContact } =
		representation;

	if (submittedForId === REPRESENTATION_SUBMITTED_FOR_ID.MYSELF) {
		return getDisplayName(SubmittedByContact);
	}

	if (submittedForId === REPRESENTATION_SUBMITTED_FOR_ID.ON_BEHALF_OF) {
		const agentName = getDisplayName(SubmittedByContact);
		const representedName = getDisplayName(RepresentedContact);

		return representedTypeId === REPRESENTED_TYPE_ID.ORGANISATION
			? `${agentName} on behalf of ${representedName}`
			: getOnBehalfTitle(agentName, submittedByAgentOrgName, representedName);
	}
}

/**
 * @param {import('./types.js').ApplicationUpdate} applicationUpdate
 * @return {object|null}
 */
export function applicationUpdateToTimelineItem(applicationUpdate) {
	if (!applicationUpdate) {
		return;
	}
	return {
		details: applicationUpdate.details,
		firstPublished: formatDateForDisplay(applicationUpdate.firstPublished, { format: 'd MMMM yyyy' })
	};
}
