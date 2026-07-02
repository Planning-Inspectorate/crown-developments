import { formatDateForDisplay, addressToViewModel } from '@planning-inspectorate/dynamic-forms';
import {
	ORGANISATION_ROLES_ID,
	REPRESENTATION_STATUS_ID,
	REPRESENTATION_SUBMITTED_FOR_ID,
	REPRESENTED_TYPE_ID
} from '@pins/crowndev-database/src/seed/data-static.ts';
import { nameToViewModel } from '@pins/crowndev-lib/util/name.js';
import {
	shouldTruncateComment,
	truncateComment,
	truncatedReadMoreCommentLink
} from '@pins/crowndev-lib/util/questions.ts';
import { getApplicationStatus, type ApplicationPublishStatus } from '@pins/crowndev-lib/util/applications.ts';
import type { Prisma } from '@pins/crowndev-database/src/client/client.ts';

import type { BaseDevelopmentView } from '@pins/crowndev-lib/util/shared-view-model.ts';
import { baseDevelopmentSelect, isInquiry, isHearing } from '@pins/crowndev-lib/util/shared-view-model.ts';

export const formatDate = (date: Date | null | undefined, options?: { format?: string }): string =>
	formatDateForDisplay(date as Date | undefined, options);

export type CrownDevelopmentView = {
	id: string;
	reference: string;
	applicationType?: string;
	applicationSubType?: string;
	applicantOrganisations: string[];
	lpaName?: string;
	SecondaryLpa?: { id: string; name: string };
	description?: string;
	stage?: string;
	procedure?: string;
	isInquiry?: boolean;
	inquiryDate?: string;
	inquiryVenue?: string | null;
	inquiryStatementsDate?: string;
	inquiryProofsOfEvidenceDate?: string;
	isHearing?: boolean;
	hearingDate?: string;
	hearingVenue?: string | null;
	applicationAcceptedDate?: string;
	representationsPeriodStartDate?: string;
	representationsPeriodEndDate?: string;
	representationsPeriodStartDateTime?: string;
	representationsPeriodEndDateTime?: string;
	decisionDate?: string;
	decisionOutcome?: string;
	crownDevelopmentContactEmail?: string;
	siteAddress?: string;
	siteCoordinates?: { easting: string; northing: string };
	containsDistressingContent?: boolean;
	applicationStatus?: ApplicationPublishStatus;
	withdrawnDate?: string;
};
type RepresentationView = {
	representationReference: string;
	representationTitle?: string;
	representationComment: string;
	representationCommentIsRedacted: boolean;
	representationCategory?: string | null;
	dateRepresentationSubmitted: string;
	hasAcceptedAttachments: boolean | undefined;
	distressingContent: boolean;
};

export function crownDevelopmentToViewModel(
	crownDevelopment: CrownDevelopmentWithRelations,
	contactEmail: string
): CrownDevelopmentView {
	const fields = {
		id: crownDevelopment.id,
		reference: crownDevelopment.reference,
		applicationType: crownDevelopment.Type?.displayName,
		applicantOrganisations:
			crownDevelopment.Organisations?.filter(
				(organisation) => organisation.role === ORGANISATION_ROLES_ID.APPLICANT
			).map((item) => item.Organisation.name) || [],
		lpaName: crownDevelopment.Lpa?.name,
		description: crownDevelopment.description,
		stage: crownDevelopment.Stage?.displayName,
		procedure: crownDevelopment.Procedure?.displayName,
		applicationAcceptedDate: formatDate(crownDevelopment.applicationAcceptedDate, { format: 'd MMMM yyyy' }),
		representationsPeriodStartDate: formatDate(crownDevelopment.representationsPeriodStartDate, {
			format: 'd MMMM yyyy'
		}),
		representationsPeriodEndDate: formatDate(crownDevelopment.representationsPeriodEndDate, {
			format: 'd MMMM yyyy'
		}),
		representationsPeriodStartDateTime: formatDate(crownDevelopment.representationsPeriodStartDate, {
			format: `d MMMM yyyy 'at' h:mmaaa`
		}),
		representationsPeriodEndDateTime: formatDate(crownDevelopment.representationsPeriodEndDate, {
			format: `d MMMM yyyy 'at' h:mmaaa`
		}),
		representationsPublishDate: formatDate(crownDevelopment.representationsPublishDate, {
			format: 'd MMMM yyyy'
		}),
		decisionDate: formatDate(crownDevelopment.decisionDate, { format: 'd MMMM yyyy' }),
		decisionOutcome: crownDevelopment.DecisionOutcome?.displayName,
		crownDevelopmentContactEmail: contactEmail,
		containsDistressingContent: crownDevelopment.containsDistressingContent
	} as CrownDevelopmentView;

	const withdrawnDateFormatted = formatDate(crownDevelopment.withdrawnDate, { format: 'd MMMM yyyy' });
	if (withdrawnDateFormatted) {
		fields.withdrawnDate = withdrawnDateFormatted;
	}

	if (crownDevelopment.SecondaryLpa && crownDevelopment.SecondaryLpa.name) {
		fields.SecondaryLpa = crownDevelopment.SecondaryLpa;
	}

	if (isInquiry(crownDevelopment.procedureId)) {
		fields.isInquiry = true;
		fields.inquiryDate = formatDate(crownDevelopment.Event?.date, { format: 'd MMMM yyyy' });
		fields.inquiryVenue = crownDevelopment.Event?.venue;
		fields.inquiryStatementsDate = formatDate(crownDevelopment.Event?.statementsDate, {
			format: 'd MMMM yyyy'
		});
		fields.inquiryProofsOfEvidenceDate = formatDate(crownDevelopment.Event?.proofsOfEvidenceDate, {
			format: 'd MMMM yyyy'
		});
	} else if (isHearing(crownDevelopment.procedureId)) {
		fields.isHearing = true;
		fields.hearingDate = formatDate(crownDevelopment.Event?.date, { format: 'd MMMM yyyy' });
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
		fields.applicationSubType = crownDevelopment.SubType?.displayName ?? '';
	}

	if (Object.prototype.hasOwnProperty.call(crownDevelopment, 'withdrawnDate')) {
		fields.applicationStatus = getApplicationStatus(crownDevelopment.withdrawnDate);
	}

	return fields;
}

export interface CrownDevelopmentCaseListView extends BaseDevelopmentView {
	applicantOrganisations: string[] | undefined;
	withdrawnDate: string | undefined;
}

export const crownDevelopmentSelect = {
	...baseDevelopmentSelect,
	withdrawnDate: true
} satisfies Prisma.CrownDevelopmentSelect;

export type CrownDevelopmentCaseListPayload = Prisma.CrownDevelopmentGetPayload<{
	select: typeof crownDevelopmentSelect;
}>;

/**
 * Crown Dev list view model formatter, formatting extended fields from Crown Development View
 *
 * @param crownDevelopment - The main db query input
 */
export function applicationListViewFormattingFunction(crownDevelopment: CrownDevelopmentCaseListPayload) {
	const extendedFields: Omit<CrownDevelopmentCaseListView, keyof BaseDevelopmentView | 'developmentContactEmail'> = {
		applicantOrganisations: undefined,
		withdrawnDate: undefined
	};

	if (crownDevelopment.Organisations && crownDevelopment.Organisations.length > 0) {
		extendedFields.applicantOrganisations = crownDevelopment.Organisations.filter(
			(organisation) => organisation.role === ORGANISATION_ROLES_ID.APPLICANT
		).map((item) => item.Organisation.name);
	}

	const withdrawnDateFormatted = formatDate(crownDevelopment.withdrawnDate, { format: 'd MMMM yyyy' });
	if (withdrawnDateFormatted) {
		extendedFields.withdrawnDate = withdrawnDateFormatted;
	}

	return extendedFields;
}

export type CrownDevelopmentWithRelations = Prisma.CrownDevelopmentGetPayload<{
	include: {
		Type: true;
		SubType: true;
		ApplicantContact: true;
		Lpa: true;
		SecondaryLpa: true;
		Stage: true;
		Procedure: true;
		DecisionOutcome: true;
		Event: true;
		SiteAddress: true;
		Organisations: { include: { Organisation: true } };
	};
}>;

type RepresentationWithContactsForView = {
	reference: string;
	submittedForId: string;
	SubmittedByContact?: RepresentationContact | null;
	RepresentedContact?: RepresentationContact | null;
	representedTypeId?: string | null;
	submittedByAgentOrgName?: string | null;
	comment?: string | null;
	commentRedacted?: string | null;
	Category?: { displayName?: string | null } | null;
	submittedDate: string | Date | undefined;
	containsAttachments?: boolean;
	Attachments?: Array<{ statusId: string }>;
	distressingContentInRepresentation?: boolean | null;
};

export function representationToViewModel(
	representation: RepresentationWithContactsForView,
	truncateCommentForView: boolean = false
): RepresentationView {
	const representationComment = representation.commentRedacted || representation.comment || '';
	return {
		representationReference: representation.reference,
		representationTitle: representationTitle(representation),
		representationComment: truncateCommentForView ? truncateComment(representationComment) : representationComment,
		representationCommentIsRedacted: Boolean(representation.commentRedacted),
		representationCategory: representation.Category?.displayName,
		dateRepresentationSubmitted: formatDateForDisplay(representation.submittedDate, { format: 'd MMMM yyyy' }),
		hasAcceptedAttachments:
			representation.Attachments?.some((doc) => doc.statusId === REPRESENTATION_STATUS_ID.ACCEPTED) &&
			representation.containsAttachments,
		distressingContent: representation.distressingContentInRepresentation || false,
		...(truncateCommentForView &&
			shouldTruncateComment(representationComment) && {
				truncatedReadMoreLink: truncatedReadMoreCommentLink(`written-representations/${representation.reference}`)
			})
	};
}

type RepresentationContact = {
	firstName?: string | null;
	lastName?: string | null;
	orgName?: string | null;
};

type RepresentationTitlePayload = {
	submittedForId: string;
	SubmittedByContact?: RepresentationContact | null;
	RepresentedContact?: RepresentationContact | null;
	representedTypeId?: string | null;
	submittedByAgentOrgName?: string | null;
};

export function representationTitle(representation: RepresentationTitlePayload): string | undefined {
	const getDisplayName = (contact?: RepresentationContact | null): string =>
		contact?.orgName ?? nameToViewModel(contact?.firstName ?? undefined, contact?.lastName ?? undefined) ?? '';

	const getOnBehalfTitle = (agent: string | null, organisation: string | null, represented: string | null): string =>
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
			: getOnBehalfTitle(agentName, submittedByAgentOrgName ?? null, representedName);
	}
}

export function applicationUpdateToTimelineItem(
	applicationUpdate: { details: string; firstPublished: Date | null } | null
): { details: string; firstPublished: string } | undefined {
	if (!applicationUpdate) return;
	return {
		details: applicationUpdate.details,
		firstPublished: formatDate(applicationUpdate.firstPublished, { format: 'd MMMM yyyy' })
	};
}
