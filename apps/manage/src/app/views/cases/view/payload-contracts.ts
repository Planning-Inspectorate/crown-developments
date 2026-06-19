import type { Prisma } from '@pins/crowndev-database/src/client/client.ts';

export const CROWN_DEVELOPMENT_VIEW_INCLUDE = {
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

/**
 * The view include without the Organisations graph.
 *
 * Derived from CROWN_DEVELOPMENT_VIEW_INCLUDE (minus Organisations) so the two can never drift:
 * adding a relation to the full include automatically flows through here. Used when an edit does not
 * touch organisations/contacts, so the expensive Organisations join can be skipped. Because the type
 * is derived from this exact shape, consumers can see Organisations is absent rather than relying on a
 * cast — see CrownDevelopmentPayloadWithoutOrganisations.
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const { Organisations: _omitOrganisations, ...CROWN_DEVELOPMENT_VIEW_INCLUDE_WITHOUT_ORGS_BASE } =
	CROWN_DEVELOPMENT_VIEW_INCLUDE;

export const CROWN_DEVELOPMENT_VIEW_INCLUDE_WITHOUT_ORGS = CROWN_DEVELOPMENT_VIEW_INCLUDE_WITHOUT_ORGS_BASE;

export const CROWN_DEVELOPMENT_LINKED_CASE_SELECT = {
	linkedParentId: true,
	ChildrenCrownDevelopment: { select: { id: true } }
} as const satisfies Prisma.CrownDevelopmentSelect;

export type CrownDevelopmentPayload = Prisma.CrownDevelopmentGetPayload<{
	include: typeof CROWN_DEVELOPMENT_VIEW_INCLUDE;
}>;

export type CrownDevelopmentPayloadWithoutOrganisations = Prisma.CrownDevelopmentGetPayload<{
	include: typeof CROWN_DEVELOPMENT_VIEW_INCLUDE_WITHOUT_ORGS;
}>;

export type CrownDevelopmentLinkedCasePayload = Prisma.CrownDevelopmentGetPayload<{
	select: typeof CROWN_DEVELOPMENT_LINKED_CASE_SELECT;
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
