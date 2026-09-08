import { ORGANISATION_ROLES_ID } from '@pins/crowndev-database/src/seed/data-static.ts';
import type { BaseDevelopmentView } from '@pins/crowndev-lib/util/shared-view-model.ts';
import type { Prisma } from '@pins/crowndev-database/src/client/client.ts';
import { baseS62ACaseSelect, type ValidatedDbPayload } from '@pins/crowndev-lib/util/shared-view-model.ts';
import { insertWbr } from '@pins/crowndev-lib/util/string.ts';

export interface S62ADevelopmentExtendedView extends BaseDevelopmentView {
	applicantOrganisations: string;
	referenceLink: string;
	lpaFormatted: string | undefined;
	location: string | undefined;
}

export const s62aDevelopmentSelect = {
	...baseS62ACaseSelect,
	S62aToApplicants: {
		select: {
			roleId: true,
			Organisation: {
				select: {
					name: true
				}
			}
		}
	},
	SiteAddress: true,
	siteEasting: true,
	siteNorthing: true
} satisfies Prisma.S62aCaseSelect;

export type S62ADevelopmentPayload = ValidatedDbPayload<
	Prisma.S62aCaseGetPayload<{ select: typeof s62aDevelopmentSelect }>
>;

type ExtendedS62AFields = Omit<S62ADevelopmentExtendedView, keyof BaseDevelopmentView>;

/**
 * S62A view model formatter, formatting extended fields from S62A Development View
 *
 * @param s62aDevelopment - The main db query input
 */
export function s62aViewFormattingFunction(s62aDevelopment: S62ADevelopmentPayload): ExtendedS62AFields {
	let applicantOrganisations = '';
	let location = undefined;
	let lpaFormatted = undefined;

	if (s62aDevelopment.S62aToApplicants?.length) {
		applicantOrganisations = s62aDevelopment.S62aToApplicants.filter(
			(applicant) => applicant.roleId === ORGANISATION_ROLES_ID.APPLICANT
		)
			.flatMap((item) => (item.Organisation?.name ? [item.Organisation.name] : []))
			.join(', ');
	}

	if (s62aDevelopment.SecondaryLpa) {
		lpaFormatted = `${s62aDevelopment.Lpa?.name}<br>${s62aDevelopment.SecondaryLpa.name}`;
	} else if (s62aDevelopment.Lpa?.name) {
		lpaFormatted = s62aDevelopment.Lpa.name;
	}

	if (s62aDevelopment.SiteAddress?.postcode) {
		location = s62aDevelopment.SiteAddress.postcode;
	} else if (s62aDevelopment.siteEasting || s62aDevelopment.siteNorthing) {
		location = `Easting: ${s62aDevelopment.siteEasting?.toString().padStart(6, '0') || '-'}\n`;
		location += `Northing: ${s62aDevelopment.siteNorthing?.toString().padStart(6, '0') || '-'}`;
	}

	return {
		applicantOrganisations,
		referenceLink: `<a class="govuk-link" href="/applications/${s62aDevelopment.id}/application-information">${insertWbr(s62aDevelopment.reference)}</a>`,
		location,
		lpaFormatted
	};
}
