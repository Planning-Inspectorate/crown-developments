import { ORGANISATION_ROLES_ID } from '@pins/crowndev-database/src/seed/data-static.ts';
import { formatDate } from '@pins/crowndev-lib/util/shared-view-model.ts';
import type { GenericDevelopmentView } from '@pins/crowndev-lib/util/shared-view-model.ts';
import type { Prisma } from '@pins/crowndev-database/src/client/client.ts';

//Service local type - Subset of main DB
export type S62ADevelopmentListItem = Prisma.CrownDevelopmentGetPayload<{
	select: {
		id: true;
		reference: true;
		description: true;
		withdrawnDate: true;
		ApplicantContact: { select: { orgName: true; firstName: true; lastName: true } };
		Lpa: { select: { name: true } };
		SecondaryLpa: { select: { id: true; name: true } };
		Stage: { select: { displayName: true } };
		Type: { select: { displayName: true } };
		Organisations: { include: { Organisation: { select: { name: true } } } };
	};
}>;

export interface S62ADevelopmentView extends GenericDevelopmentView {
	developmentContactEmail: string;
	applicantOrganisations?: string[];
	lpaName?: string;
	SecondaryLpa?: { id: string; name: string };
	stage?: string;
	withdrawnDate?: string;
}

//New filter function for the genericDevelopmentToViewModel function
//Placeholder Function

/**
 * App specific function for case list DB manipulation as input into genericDevelopmentToViewModel
 * @constructor
 * @param {MinimumDevelopmentRequirements} s62aDevelopments - The main db query input
 */
export function s62aViewFormattingFunction(s62aDevelopments: S62ADevelopmentListItem) {
	const withdrawnDateFormatted = formatDate(s62aDevelopments.withdrawnDate, { format: 'd MMMM yyyy' });

	const extendedFields: Omit<S62ADevelopmentView, 'id' | 'reference' | 'description' | 'developmentContactEmail'> = {};

	extendedFields.lpaName = s62aDevelopments.Lpa?.name;

	if (s62aDevelopments.Organisations && s62aDevelopments.Organisations.length > 0) {
		extendedFields.applicantOrganisations = s62aDevelopments.Organisations.filter(
			(organisation) => organisation.role === ORGANISATION_ROLES_ID.APPLICANT
		).map((item) => item.Organisation.name);
	}

	if (withdrawnDateFormatted) {
		extendedFields.withdrawnDate = withdrawnDateFormatted;
	}

	if (s62aDevelopments.SecondaryLpa && s62aDevelopments.SecondaryLpa.name) {
		extendedFields.SecondaryLpa = s62aDevelopments.SecondaryLpa;
	}

	extendedFields.stage = s62aDevelopments.Stage?.displayName ?? undefined;

	return extendedFields;
}
