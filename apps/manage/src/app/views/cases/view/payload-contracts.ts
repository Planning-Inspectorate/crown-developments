import type { Prisma } from '@pins/crowndev-database/src/client/client.ts';

export const CROWN_DEVELOPMENT_VIEW_INCLUDE = {
	ApplicantContact: { include: { Address: true } },
	AgentContact: { include: { Address: true } },
	Category: { include: { ParentCategory: true } },
	Event: true,
	Lpa: { include: { Address: true } },
	SecondaryLpa: { include: { Address: true } },
	SiteAddress: true,
	ParentCrownDevelopment: { select: { id: true, siteAddressId: true, reference: true } },
	ChildrenCrownDevelopment: { select: { id: true, siteAddressId: true, reference: true } },
	Organisations: {
		include: {
			Organisation: {
				include: {
					Address: true,
					OrganisationToContact: {
						include: {
							Contact: { include: { Address: true } }
						}
					}
				}
			}
		}
	}
} as const satisfies Prisma.CrownDevelopmentInclude;

export type CrownDevelopmentPayload = Prisma.CrownDevelopmentGetPayload<{
	include: typeof CROWN_DEVELOPMENT_VIEW_INCLUDE;
}>;

export const CROWN_DEVELOPMENT_PLANNING_INCLUDE = {
	Organisations: {
		include: {
			Organisation: {
				include: {
					Address: true,
					OrganisationToContact: { include: { Contact: true } }
				}
			}
		}
	}
} as const satisfies Prisma.CrownDevelopmentInclude;

export type CrownDevelopmentPlanningPayload = Prisma.CrownDevelopmentGetPayload<{
	include: typeof CROWN_DEVELOPMENT_PLANNING_INCLUDE;
}>;
