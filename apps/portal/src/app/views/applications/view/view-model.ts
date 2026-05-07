import {
	formatDateForDisplay,
	isNowAfterStartDate,
	nowIsWithinRange,
	addressToViewModel
} from '@planning-inspectorate/dynamic-forms';
import {
	APPLICATION_PROCEDURE_ID,
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
} from '@pins/crowndev-lib/util/questions.js';
import {
	getApplicationStatus,
	isWithdrawnOrExpired,
	isExpired,
	type ApplicationPublishStatus
} from '#util/applications.ts';
import type { Prisma } from '@pins/crowndev-database/src/client/client.ts';

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
type ApplicationLink = {
	href: string;
	text: string;
};
type RepresentationWithContacts = Prisma.RepresentationGetPayload<
	Prisma.RepresentationDefaultArgs & {
		include: {
			SubmittedByContact: true;
			RepresentedContact: true;
		};
	}
>;
export type CrownDevelopmentView = {
	id: string;
	reference: string;
	applicationType?: string;
	applicationSubType?: string;
	applicantName?: string; //TODO: CROWN-1509 Remove once multiple entities is switched over.
	applicantOrganisations?: string[]; //TODO: CROWN-1509 No longer nullable once switched over
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
	hasAcceptedAttachments: boolean | null;
	distressingContent: boolean;
};

const formatDate = (date: Date | null | undefined, options?: { format?: string }): string =>
	formatDateForDisplay(date as Date | undefined, options);

export function crownDevelopmentToViewModel(
	crownDevelopment: CrownDevelopmentWithRelations,
	contactEmail: string
): CrownDevelopmentView {
	const fields = {
		id: crownDevelopment.id,
		reference: crownDevelopment.reference,
		applicationType: crownDevelopment.Type?.displayName,
		applicantName: crownDevelopment.ApplicantContact?.orgName, //TODO: CROWN-1509 Remove once multiple entities is switched over.
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

	// TODO: CROWN-1509 - Move to default fields once multiple entities is switched over.
	if (crownDevelopment.Organisations && crownDevelopment.Organisations.length > 0) {
		fields.applicantOrganisations = crownDevelopment.Organisations.filter(
			(organisation) => organisation.role === ORGANISATION_ROLES_ID.APPLICANT
		).map((item) => item.Organisation.name);
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

function isInquiry(procedureId: string | null): boolean {
	return procedureId === APPLICATION_PROCEDURE_ID.INQUIRY;
}

function isHearing(procedureId: string | null): boolean {
	return procedureId === APPLICATION_PROCEDURE_ID.HEARING;
}

/**
 * Build the application navigation links for the various application view pages.
 */
export function applicationLinks(
	id: string,
	haveYourSayPeriod: { start: Date | null; end: Date | null },
	representationsPublishDate: Date | null,
	displayApplicationUpdates: boolean,
	applicationStatus: ApplicationPublishStatus | undefined = undefined
): ApplicationLink[] {
	const links = [
		{
			href: `/applications/${id}/application-information`,
			text: 'Application information'
		}
	];

	if (isExpired(applicationStatus)) {
		return links;
	}

	links.push({
		href: `/applications/${id}/documents`,
		text: 'Documents'
	});
	if (
		!isWithdrawnOrExpired(applicationStatus) &&
		haveYourSayPeriod?.start &&
		haveYourSayPeriod?.end &&
		nowIsWithinRange(haveYourSayPeriod?.start, haveYourSayPeriod?.end)
	) {
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
	if (representationsPublishDate && isNowAfterStartDate(representationsPublishDate)) {
		links.push({
			href: `/applications/${id}/written-representations`,
			text: 'Written representations'
		});
	}

	return links;
}

export function representationToViewModel(
	representation: RepresentationWithContacts,
	truncateCommentForView: boolean = false
): RepresentationView {
	const representationComment = representation.commentRedacted || representation.comment;
	return {
		representationReference: representation.reference,
		representationTitle: representationTitle(representation),
		representationComment: truncateCommentForView
			? (truncateComment(representationComment) as string)
			: representationComment,
		representationCommentIsRedacted: Boolean(representation.commentRedacted),
		representationCategory: representation.Category?.displayName,
		dateRepresentationSubmitted: formatDateForDisplay(representation.submittedDate),
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

export function representationTitle(representation: RepresentationWithContacts): string | undefined {
	const getDisplayName = (contact: Prisma.ContactGetPayload<Prisma.ContactDefaultArgs> | null): string =>
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
			: getOnBehalfTitle(agentName, submittedByAgentOrgName, representedName);
	}
}

export function applicationUpdateToTimelineItem(
	applicationUpdate: Prisma.ApplicationUpdateGetPayload<object>
): { details: string; firstPublished: string } | undefined {
	if (!applicationUpdate) {
		return;
	}
	return {
		details: applicationUpdate.details,
		firstPublished: formatDate(applicationUpdate.firstPublished, { format: 'd MMMM yyyy' })
	};
}
