import type { Prisma } from '@pins/crowndev-database/src/client/client.ts';
import { ORGANISATION_ROLES_ID } from '@pins/crowndev-database/src/seed/data-static.ts';
import { APPLICANT_TYPE_ID } from '@pins/crowndev-database/src/seed/s62a/data-static.ts';
import { type ApplicationPublishStatus, getApplicationStatus } from '@pins/crowndev-lib/util/applications.ts';
import { addressToViewModel } from '@planning-inspectorate/dynamic-forms';

export type S62aCaseWithRelations = Prisma.S62aCaseGetPayload<{
	include: {
		S62aDates: true;
		Type: true;
		Lpa: true;
		SecondaryLpa: true;
		ApplicantType: true;
		S62aToApplicants: {
			include: {
				Contact: true;
				Organisation: true;
			};
		};
		SiteAddress: true;
		Procedure: true;
	};
}>;

export type S62aCaseView = {
	id: string;
	reference: string;
	applicationType: string;
	lpaName: string;
	applicants: string[] | [];
	description: string;
	applicationStatus?: ApplicationPublishStatus;
	secondaryLpaName?: string;
	siteAddress?: string;
	siteCoordinates?: { easting: string; northing: string };
	procedure?: string;
};

/**
 * Creates the applicants strings array from the two choices for applicants:
 * 1) Organisations
 * 2) Individual contacts
 */
function formatApplicants(s62aCase: S62aCaseWithRelations) {
	const isIndividual = s62aCase.ApplicantType?.id === APPLICANT_TYPE_ID.INDIVIDUAL;

	const applicants = (s62aCase.S62aToApplicants ?? []).flatMap((relation) => {
		if (relation.roleId !== ORGANISATION_ROLES_ID.APPLICANT) {
			return [];
		}

		if (isIndividual) {
			const { firstName, lastName } = relation.Contact ?? {};
			return typeof firstName === 'string' && typeof lastName === 'string' ? [`${firstName} ${lastName}`] : [];
		}

		const orgName = relation.Organisation?.name;
		return typeof orgName === 'string' ? [orgName] : [];
	});

	return applicants;
}

/**
 * Creates the view model for the s62a case
 */
export function s62aCaseToViewModel(s62aCase: S62aCaseWithRelations): S62aCaseView {
	const fields = {
		id: s62aCase.id,
		reference: s62aCase.reference,
		applicationType: s62aCase.Type?.displayName,
		lpaName: s62aCase.Lpa?.name,
		applicants: formatApplicants(s62aCase),
		description: s62aCase.description
	} as S62aCaseView;

	if (s62aCase.SecondaryLpa && s62aCase.SecondaryLpa.name) {
		fields.secondaryLpaName = s62aCase.SecondaryLpa.name;
	}

	if (s62aCase.S62aDates && 'withdrawnDate' in s62aCase.S62aDates) {
		fields.applicationStatus = getApplicationStatus(s62aCase.S62aDates.withdrawnDate);
	}

	if (s62aCase.SiteAddress?.postcode) {
		fields.siteAddress = addressToViewModel(s62aCase.SiteAddress);
	}

	if (s62aCase.siteEasting && s62aCase.siteNorthing) {
		fields.siteCoordinates = {
			easting: s62aCase.siteEasting.toString().padStart(6, '0'),
			northing: s62aCase.siteNorthing.toString().padStart(6, '0')
		};
	}

	if (s62aCase.Procedure?.displayName) {
		fields.procedure = s62aCase.Procedure?.displayName;
	}

	return fields;
}
