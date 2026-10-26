import {
	REPRESENTATION_STATUS_ID,
	REPRESENTATION_SUBMITTED_FOR_ID,
	REPRESENTED_TYPE_ID
} from '@pins/crowndev-database/src/seed/data-static.ts';
import { nameToViewModel } from '@pins/crowndev-lib/util/name.js';
import { TRUNCATED_MAX_LENGTH } from '@planning-inspectorate/dynamic-forms';
import {
	shouldTruncateComment,
	truncateComment,
	truncatedReadMoreCommentLink
} from '@pins/crowndev-lib/util/questions.ts';
import { formatDateForDisplay } from '@planning-inspectorate/dynamic-forms';

import { dateIsBeforeToday, dateIsAfterToday } from '@planning-inspectorate/dynamic-forms';
import { formatDateTime } from '@pins/crowndev-lib/util/date-util.ts';
import type { ApplicationPublishStatus } from '@pins/crowndev-lib/util/applications.ts';

export type WrittenRepresentationsCaseFields = {
	reference: string;
	applicationStatus?: ApplicationPublishStatus;
	representationsPeriodStartDate?: Date | null;
	representationsPeriodEndDate?: Date | null;
	representationsPublishDate: Date | null;
	containsDistressingContent?: boolean | null;
};

type RepresentationFields = Pick<
	WrittenRepresentationsCaseFields,
	'representationsPeriodStartDate' | 'representationsPeriodEndDate' | 'representationsPublishDate'
>;

type RepresentationView = {
	representationReference: string;
	representationTitle?: string;
	representationComment: string;
	representationCommentIsRedacted: boolean;
	representationCategory?: string | null;
	dateRepresentationSubmitted: string;
	hasAcceptedAttachments: boolean | null;
	distressingContent: boolean;
};

type RepresentationContactForTitle = {
	orgName?: string | null;
	firstName?: string | null;
	lastName?: string | null;
};

export type RepresentationWithContacts = {
	reference: string;
	submittedDate: Date;
	comment: string;
	commentRedacted: string | null;
	submittedForId: string;
	representedTypeId: string | null;
	representedGroupName?: string | null;
	submittedByAgentOrgName: string | null;
	containsAttachments: boolean | null;
	distressingContentInRepresentation: boolean | null;
	withholdName?: boolean | null;
	SubmittedByContact: RepresentationContactForTitle | null;
	RepresentedContact?: RepresentationContactForTitle | null;
	RepresentedContacts?: RepresentationContactForTitle[];
	Category?: { displayName: string | null } | null;
	Attachments: { statusId: string }[];
};

type RepresentationViewOptions = {
	showWithheldNameAsInterestedParty?: boolean;
};

/*
 * Function to return correct representation page menu copy when no published representations are present
 */
export function getRepresentationMessages(
	representationFields: RepresentationFields,
	hasAcceptedRepresentations: boolean = false,
	representationsSubmitted: boolean = false
): string[] {
	const messages: string[] = [];

	const startDate = representationFields.representationsPeriodStartDate;
	const endDate = representationFields.representationsPeriodEndDate;
	const publishDate = representationFields.representationsPublishDate;

	const now = new Date();

	const isPeriodNotYetOpen = startDate ? dateIsAfterToday(startDate) : false;
	const isPeriodOpen = startDate && endDate ? now >= startDate && now <= endDate : false;
	const isPeriodClosed = endDate ? dateIsBeforeToday(endDate) : false;

	if (isPeriodNotYetOpen || (!startDate && !endDate)) {
		messages.push('No written representations have been published yet.');

		if (!startDate && !endDate) {
			// A. Representation period not yet open & No representation period dates set
			messages.push(
				'You can submit a written representation (also known as ‘Have your say’) when the representation period is announced and open.'
			);
		} else if (startDate && endDate) {
			// B. Representation period not yet open & Representation period dates set in the future
			const formattedStart = formatDateTime(startDate);
			const formattedEnd = formatDateTime(endDate);
			messages.push(
				`You can submit a written representation (also known as ‘Have your say’) from: ${formattedStart} - ${formattedEnd}`
			);
		}
		return messages;
	}

	if (isPeriodOpen) {
		if (!representationsSubmitted) {
			//C. Representation period open & No representations have been submitted
			messages.push('No written representations have been submitted yet.');
			return messages;
		}

		if (!hasAcceptedRepresentations) {
			//D. Representation period open & Representations have been submitted but they are still in ‘Awaiting review' || F. &  Representation period open & Representations have been submitted but all are rejected
			messages.push('No written representations have been published yet.');
			messages.push(
				'We’re currently reviewing all submissions and will publish them on this page once the review is complete.'
			);
			return messages;
		}

		messages.push('No written representations have been published yet.');
		if (!publishDate) {
			//G. Representation period open  & Representations have been submitted and there is at least 1 accepted & Representations publish date not yet set
			messages.push('We’ll update this page once the date to publish representations has been set.');
		} else if (dateIsAfterToday(publishDate)) {
			//H. Representation period open  & Representations have been submitted and there is at least 1 accepted & Representations publish date in future
			const formattedPublishDate = publishDate.toLocaleDateString('en-GB', {
				day: '2-digit',
				month: 'long',
				year: 'numeric'
			});
			messages.push(`You’ll be able to view the published representations from ${formattedPublishDate}`);
		}
		return messages;
	}

	if (isPeriodClosed) {
		if (!hasAcceptedRepresentations) {
			//J. Representation period closed & Representations submitted all rejected or in awaiting review & Representations publish date is in the past
			messages.push('No written representations have been published yet.');
			messages.push(
				'We’re currently reviewing all submissions and will publish them on this page once the review is complete.'
			);
			return messages;
		}

		if (hasAcceptedRepresentations && publishDate && !dateIsAfterToday(publishDate)) {
			//K. Representation period closed & Representations have been submitted and there is at least 1 accepted & Representations publish date is in the past
			return [];
		}
	}

	return messages;
}

export function representationToViewModel(
	representation: RepresentationWithContacts,
	truncateCommentForView: boolean = false,
	options: RepresentationViewOptions = {}
): RepresentationView {
	const representationComment = representation.commentRedacted || representation.comment;
	return {
		representationReference: representation.reference,
		representationTitle: representationTitle(representation, options),
		representationComment: truncateCommentForView
			? truncateComment(representationComment, TRUNCATED_MAX_LENGTH)
			: representationComment,
		representationCommentIsRedacted: Boolean(representation.commentRedacted),
		representationCategory: representation.Category?.displayName,
		dateRepresentationSubmitted: formatDateForDisplay(representation.submittedDate, { format: 'd MMMM yyyy' }),
		hasAcceptedAttachments:
			representation.Attachments?.some((doc) => doc.statusId === REPRESENTATION_STATUS_ID.ACCEPTED) &&
			representation.containsAttachments,
		distressingContent: representation.distressingContentInRepresentation || false,
		...(truncateCommentForView &&
			shouldTruncateComment(representationComment, TRUNCATED_MAX_LENGTH) && {
				truncatedReadMoreLink: truncatedReadMoreCommentLink(`written-representations/${representation.reference}`)
			})
	};
}

export function representationTitle(
	representation: RepresentationWithContacts,
	options: RepresentationViewOptions = {}
): string | undefined {
	if (options.showWithheldNameAsInterestedParty && representation.withholdName) {
		return 'Interested Party';
	}
	const getDisplayName = (contact: RepresentationContactForTitle | null): string =>
		contact?.orgName ?? nameToViewModel(contact?.firstName ?? undefined, contact?.lastName ?? undefined) ?? '';

	const getOnBehalfTitle = (agent: string | null, organisation: string | null, represented: string | null): string =>
		organisation ? `${agent} (${organisation}) on behalf of ${represented}` : `${agent} on behalf of ${represented}`;

	const { submittedForId, representedTypeId, representedGroupName, submittedByAgentOrgName, SubmittedByContact } =
		representation;
	const RepresentedContact = representation.RepresentedContact ?? representation.RepresentedContacts?.[0] ?? null;

	if (submittedForId === REPRESENTATION_SUBMITTED_FOR_ID.MYSELF) {
		return getDisplayName(SubmittedByContact);
	}

	if (submittedForId === REPRESENTATION_SUBMITTED_FOR_ID.ON_BEHALF_OF) {
		const agentName = getDisplayName(SubmittedByContact);
		const representedName =
			representedGroupName?.trim() ||
			(representedTypeId === REPRESENTED_TYPE_ID.GROUP && representation.RepresentedContacts?.length
				? representation.RepresentedContacts.map(getDisplayName).filter(Boolean).join(', ')
				: getDisplayName(RepresentedContact));

		return representedTypeId === REPRESENTED_TYPE_ID.ORGANISATION
			? `${agentName} on behalf of ${representedName}`
			: getOnBehalfTitle(agentName, submittedByAgentOrgName, representedName);
	}
}
