import { Prisma } from '@pins/crowndev-database/src/client/client.js';

export interface CrownDevelopmentListViewModel {
	id: string;
	reference?: string;
	location?: string;
	lpaName?: string;
	status?: string | null;
	type?: string | null;
}

const listArgs = Prisma.validator<Prisma.CrownDevelopmentDefaultArgs>()({
	select: {
		id: true,
		reference: true,
		siteNorthing: true,
		siteEasting: true,
		SiteAddress: true,
		Lpa: { select: { name: true } },
		Status: { select: { displayName: true } },
		Type: { select: { displayName: true } }
	}
});

// todo: this doesn't seem to work in WebStorm, but is fine in vscode
// see https://www.prisma.io/docs/orm/prisma-client/type-safety/operating-against-partial-structures-of-model-types#solution
export type CrownDevelopmentListFields = Prisma.CrownDevelopmentGetPayload<typeof listArgs>;
