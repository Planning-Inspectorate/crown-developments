import { Prisma } from '@prisma/client';

export interface CrownDevelopmentListViewModel {
	id: string;
	reference?: string;
	applicationType?: string;
	applicantName?: string;
	lpaName?: string;
	description?: string;
	stage?: string;
	procedure?: string;
	isInquiry?: boolean;
	inquiryDate?: string;
	inquiryVenue?: string;
	inquiryStatementsDate?: string;
	inquiryProofsOfEvidenceDate?: string;
	isHearing?: boolean;
	hearingDate?: string;
	hearingVenue?: string;
	applicationAcceptedDate?: string;
	representationsPeriodStartDate?: string;
	representationsPeriodEndDate?: string;
	representationsPeriodStartDateTime?: string;
	representationsPeriodEndDateTime?: string;
	decisionDate?: string;
	crownDevelopmentContactEmail?: string;
	siteAddress?: string;
	siteCoordinates?: { easting: string; northing: string };
}

const listArgs = Prisma.validator<Prisma.CrownDevelopmentDefaultArgs>()({
	select: {
		id: true,
		reference: true,
		ApplicantContact: { include: { Address: true } },
		Lpa: true,
		Type: true,
		SiteAddress: true,
		Category: true,
		Attachments: true
	}
});

// todo: this doesn't seem to work in WebStorm, but is fine in vscode
// see https://www.prisma.io/docs/orm/prisma-client/type-safety/operating-against-partial-structures-of-model-types#solution
export type CrownDevelopmentListFields = Prisma.CrownDevelopmentGetPayload<typeof listArgs>;

export type RepresentationsListFields = Prisma.RepresentationGetPayload<typeof listArgs>;

export type RepresentationViewModel = {
	representationReference: string;
	representationTitle: string;
	representationComment: string;
	representationCommentIsRedacted: boolean;
	representationCategory: string;
	dateRepresentationSubmitted: string;
	representationContainsAttachments: string;
	hasAcceptedAttachments: boolean;
};

export interface ApplicationLink {
	href: string;
	text: string;
}
