import type { Prisma } from '@pins/crowndev-database/src/client/client.ts';
import { addressToViewModel } from '@pins/crowndev-lib/util/address.ts';
import { ORGANISATION_ROLES_ID } from '@pins/crowndev-database/src/seed/data-static.ts';
import { insertWbr, formatStatusTag } from '@pins/crowndev-lib/util/string.ts';

export interface S62ACaseView {
	id: string;
	reference: string;
	lpaName: string | undefined;
	applicationType?: string;
	applicationSubType?: string;
	applicantOrganisations: string[];
	location: string;
	type?: string;
	status?: string;
	withdrawnDate?: Date | null;
}

export const s62aCaseSelect = {
	id: true,
	reference: true,
	Lpa: { select: { name: true } },
	description: true,
	Type: { select: { displayName: true } },
	S62aToApplicants: { include: { Organisation: { select: { name: true } } } },
	SecondaryLpa: true,
	S62aStatus: true,
	SiteAddress: true,
	siteEasting: true,
	siteNorthing: true
} satisfies Prisma.S62aCaseSelect;

export type S62ACasePayload = Prisma.S62aCaseGetPayload<{
	select: typeof s62aCaseSelect;
}>;

export function s62aToViewModel(s62aCases: S62ACasePayload) {
	const fields = {
		id: s62aCases.id,
		reference: s62aCases.reference,
		lpaName: s62aCases.Lpa?.name,
		status: formatStatusTag(s62aCases.S62aStatus?.displayName),
		type: s62aCases.Type?.displayName ?? undefined,
		applicantOrganisations:
			s62aCases.S62aToApplicants?.filter(
				(relation) =>
					relation.roleId === ORGANISATION_ROLES_ID.APPLICANT && typeof relation.Organisation?.name === 'string'
			).map((item) => item.Organisation!.name) ?? [],
		location: '',
		referenceLink: '<a class="govuk-link" href="/cases/' + s62aCases.id + '">' + insertWbr(s62aCases.reference) + '</a>'
	};
	if (s62aCases.SiteAddress) {
		const address = addressToViewModel(s62aCases.SiteAddress);
		fields.location = [
			address?.addressLine1,
			address?.addressLine2,
			address?.townCity,
			address?.county,
			address?.postcode
		]
			.filter(Boolean)
			.join(', ');
	} else if (s62aCases.siteEasting || s62aCases.siteNorthing) {
		fields.location = `Easting: ${s62aCases.siteEasting?.toString().padStart(6, '0') || '-'}\n`;
		fields.location += `Northing: ${s62aCases.siteNorthing?.toString().padStart(6, '0') || '-'}`;
	}

	return fields;
}
