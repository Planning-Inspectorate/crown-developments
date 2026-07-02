import { ORGANISATION_ROLES_ID } from '@pins/crowndev-database/src/seed/data-static.ts';
import type { BaseDevelopmentView } from '@pins/crowndev-lib/util/shared-view-model.ts';
import type { Prisma } from '@pins/crowndev-database/src/client/client.ts';
import { baseDevelopmentSelect } from '@pins/crowndev-lib/util/shared-view-model.ts';

export interface S62ADevelopmentView extends BaseDevelopmentView {
	applicantOrganisations: string[];
	withdrawnDate: Date | null;
}

export const s62aDevelopmentSelect = {
	...baseDevelopmentSelect,
	SecondaryLpa: { select: { id: true, name: true } },
	withdrawnDate: true
} satisfies Prisma.CrownDevelopmentSelect;

export type S62ADevelopmentPayload = Prisma.CrownDevelopmentGetPayload<{
	select: typeof s62aDevelopmentSelect;
}>;

/**
 * S62A view model formatter, formatting extended fields from S62A Development View
 *
 * @param s62aDevelopment - The main db query input
 */
export function s62aViewFormattingFunction(s62aDevelopment: S62ADevelopmentPayload) {
	const extendedFields: Omit<S62ADevelopmentView, keyof BaseDevelopmentView | 'developmentContactEmail'> = {
		applicantOrganisations: [],
		withdrawnDate: s62aDevelopment.withdrawnDate
	};

	if (s62aDevelopment.Organisations && s62aDevelopment.Organisations.length > 0) {
		extendedFields.applicantOrganisations = s62aDevelopment.Organisations.filter(
			(organisation) => organisation.role === ORGANISATION_ROLES_ID.APPLICANT
		).map((item) => item.Organisation.name);
	}

	return extendedFields;
}
