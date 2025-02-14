import { Prisma } from '@prisma/client';

export interface CrownDevelopmentListViewModel {
	id: string;
	reference?: string;
	applicationType?: string;
	applicantName?: string;
	lpaName?: string;
	description?: string;
	crownDevelopmentContactEmail?: string;
	siteAddress?: string;
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
