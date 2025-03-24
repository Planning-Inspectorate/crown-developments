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
	applicationCompleteDate?: string;
	representationsPeriodStartDate?: string;
	representationsPeriodEndDate?: string;
	decisionDate?: string;
	crownDevelopmentContactEmail?: string;
	siteAddress?: string;
}

export interface RepresentationCreateAnswers {
	submittedDate?: string;
	submittedForId: string;
	representedTypeId?: string;
	agentOrgName?: string;
	areYouAgent?: string;
	myselfComment?: string;
	myselfFullName?: string;
	myselfEmail?: string;
	myselfIsAdult?: string;
	submitterComment?: string;
	submitterFullName?: string;
	submitterEmail?: string;
	submitterIsAdult?: string;
	orgRoleName?: string;
	representedFullName?: string;
	representedIsAdult?: string;
	representedOrgName?: string;
	orgName?: string;
}

const listArgs = Prisma.validator<Prisma.CrownDevelopmentDefaultArgs>()({
	select: {
		id: true,
		reference: true,
		ApplicantContact: { include: { Address: true } },
		Lpa: true,
		Type: true,
		SiteAddress: true
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
};

export interface ApplicationLink {
	href: string;
	text: string;
}
