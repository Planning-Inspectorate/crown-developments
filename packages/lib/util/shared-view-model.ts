import { formatDateForDisplay, isNowAfterStartDate, nowIsWithinRange } from '@planning-inspectorate/dynamic-forms';
import { APPLICATION_PROCEDURE_ID } from '@pins/crowndev-database/src/seed/data-static.ts';
import {
	isWithdrawnOrExpired,
	isExpired,
	type ApplicationPublishStatus
} from '@pins/crowndev-lib/util/applications.ts';
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
import { CASE_DATA_MODEL, type CaseDataModel } from '@pins/crowndev-lib/util/types.ts';
import type { Prisma } from '@pins/crowndev-database/src/client/client.ts';

export type ApplicationLink = {
	href: string;
	text: string;
};

export const formatDate = (date: Date | null | undefined, options?: { format?: string }): string =>
	formatDateForDisplay(date as Date | undefined, options);

export function isInquiry(procedureId: string | null): boolean {
	return procedureId === APPLICATION_PROCEDURE_ID.INQUIRY;
}

export function isHearing(procedureId: string | null): boolean {
	return procedureId === APPLICATION_PROCEDURE_ID.HEARING;
}

export interface BaseDevelopmentDbRecord {
	id: string;
	reference: string;
	description: string | null;
	Lpa?: { name?: string | null } | null;
	Stage?: { displayName?: string | null } | null;
	SecondaryLpa?: { name?: string | null } | null;
}

export type BaseDevelopmentView = {
	id: string;
	reference: string;
	developmentContactEmail: string | undefined;
	description: string | null;
	lpaName: string | undefined;
	stage: string | undefined;
	secondaryLpa: string | undefined;
};

export type ValidatedDbPayload<T extends BaseDevelopmentDbRecord> = T;

export const baseCrownDevelopmentSelect = {
	id: true,
	reference: true,
	description: true,
	Lpa: { select: { name: true } },
	Stage: { select: { displayName: true } },
	SecondaryLpa: { select: { name: true } }
} satisfies Prisma.CrownDevelopmentSelect;

export type BaseCrownDevelopmentPayload = ValidatedDbPayload<
	Prisma.CrownDevelopmentGetPayload<{ select: typeof baseCrownDevelopmentSelect }>
>;

export const baseS62ACaseSelect = {
	id: true,
	reference: true,
	description: true,
	Lpa: { select: { name: true } },
	Stage: { select: { displayName: true } },
	SecondaryLpa: { select: { name: true } }
} satisfies Prisma.S62aCaseSelect;

export type BaseS62ACasePayload = ValidatedDbPayload<Prisma.S62aCaseGetPayload<{ select: typeof baseS62ACaseSelect }>>;

/**
 * Higher Order Function to take database queries and prepare them for display as view models
 *
 * @param developmentData - The main db query input
 * @param contactEmail - The contact email associated with the app service
 * @param developmentFormattingFunction - Function required to modify the db query input for use in the view model
 */
export function mapDevelopmentToViewModel<
	T extends BaseDevelopmentDbRecord,
	E extends Record<string, unknown> = Record<string, never>
>(
	developmentData: T,
	contactEmail: string | undefined,
	developmentFormattingFunction?: (input: T) => E
): BaseDevelopmentView & E {
	const fields = {
		id: developmentData.id,
		reference: developmentData.reference,
		description: developmentData.description,
		developmentContactEmail: contactEmail,
		lpaName: developmentData.Lpa?.name ?? undefined,
		stage: developmentData.Stage?.displayName ?? undefined,
		secondaryLpa: developmentData.SecondaryLpa?.name ?? undefined
	};

	const extendedFields = developmentFormattingFunction ? developmentFormattingFunction(developmentData) : ({} as E);

	return { ...extendedFields, ...fields };
}

/**
 * Build the application navigation links for the various application view pages.
 */
export function applicationLinks(
	id: string,
	haveYourSayPeriod: { start: Date | null; end: Date | null },
	representationsPublishDate: Date | null,
	displayApplicationUpdates: boolean,
	applicationStatus: ApplicationPublishStatus | undefined = undefined,
	tabText?: Record<string, string>,
	service?: CaseDataModel
): ApplicationLink[] {
	const links = [
		{
			href: `/applications/${id}/application-information`,
			text: tabText?.applicationInformation ?? 'Application information'
		}
	];

	if (service == CASE_DATA_MODEL.CROWN) {
		if (isExpired(applicationStatus)) {
			return links;
		}
	}

	links.push({
		href: `/applications/${id}/documents`,
		text: tabText?.documents ?? 'Documents'
	});
	if (
		!isWithdrawnOrExpired(applicationStatus) &&
		haveYourSayPeriod?.start &&
		haveYourSayPeriod?.end &&
		nowIsWithinRange(haveYourSayPeriod?.start, haveYourSayPeriod?.end)
	) {
		links.push({
			href: `/applications/${id}/have-your-say`,
			text: tabText?.haveYourSay ?? 'Have your say'
		});
	}
	if (displayApplicationUpdates) {
		links.push({
			href: `/applications/${id}/application-updates`,
			text: tabText?.applicationUpdates ?? 'Application updates'
		});
	}

	if (
		service == CASE_DATA_MODEL.S62A ||
		(representationsPublishDate && isNowAfterStartDate(representationsPublishDate))
	) {
		links.push({
			href: `/applications/${id}/written-representations`,
			text: tabText?.writtenRepresentations ?? 'Written representations'
		});
	}

	return links;
}

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
	listS62aGroupParticipants?: boolean;
};

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
		const groupParticipantNames = representation.RepresentedContacts?.map(getDisplayName).filter(Boolean);
		const representedName =
			options.listS62aGroupParticipants &&
			representedTypeId === REPRESENTED_TYPE_ID.GROUP &&
			!representedGroupName?.trim()
				? (groupParticipantNames?.join(', ') ?? '')
				: representedGroupName?.trim() || getDisplayName(RepresentedContact);

		return representedTypeId === REPRESENTED_TYPE_ID.ORGANISATION
			? `${agentName} on behalf of ${representedName}`
			: getOnBehalfTitle(agentName, submittedByAgentOrgName, representedName);
	}
}
