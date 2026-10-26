import { formatDateForDisplay, addressToViewModel } from '@planning-inspectorate/dynamic-forms';
import { ORGANISATION_ROLES_ID } from '@pins/crowndev-database/src/seed/data-static.ts';
import { getApplicationStatus, type ApplicationPublishStatus } from '@pins/crowndev-lib/util/applications.ts';
import type { Prisma } from '@pins/crowndev-database/src/client/client.ts';

import type { BaseDevelopmentView } from '@pins/crowndev-lib/util/shared-view-model.ts';
import {
	baseCrownDevelopmentSelect,
	isInquiry,
	isHearing,
	type ValidatedDbPayload
} from '@pins/crowndev-lib/util/shared-view-model.ts';

import { insertWbr } from '@pins/crowndev-lib/util/string.ts';

export const formatDate = (date: Date | null | undefined, options?: { format?: string }): string =>
	formatDateForDisplay(date as Date | undefined, options);

export type CrownDevelopmentView = {
	id: string;
	reference: string;
	applicationType?: string;
	applicationSubType?: string;
	applicantOrganisations: string[];
	lpaName?: string;
	SecondaryLpa?: { id: string; name: string };
	description?: string;
	stage?: string;
	procedure?: string;
	isInquiry?: boolean;
	inquiryDate?: string;
	inquiryVenue?: string | null;
	inquiryStatementsDate?: string;
	inquiryProofsOfEvidenceDate?: string;
	isHearing?: boolean;
	hearingDate?: string;
	hearingVenue?: string | null;
	applicationAcceptedDate?: string;
	representationsPeriodStartDate?: string;
	representationsPeriodEndDate?: string;
	representationsPeriodStartDateTime?: string;
	representationsPeriodEndDateTime?: string;
	decisionDate?: string;
	decisionOutcome?: string;
	crownDevelopmentContactEmail?: string;
	siteAddress?: string;
	siteCoordinates?: { easting: string; northing: string };
	containsDistressingContent?: boolean;
	applicationStatus?: ApplicationPublishStatus;
	withdrawnDate?: string;
};

export function crownDevelopmentToViewModel(
	crownDevelopment: CrownDevelopmentWithRelations,
	contactEmail: string
): CrownDevelopmentView {
	const fields = {
		id: crownDevelopment.id,
		reference: crownDevelopment.reference,
		applicationType: crownDevelopment.Type?.displayName,
		applicantOrganisations:
			crownDevelopment.Organisations?.filter(
				(organisation) => organisation.role === ORGANISATION_ROLES_ID.APPLICANT
			).map((item) => item.Organisation.name) || [],
		lpaName: crownDevelopment.Lpa?.name,
		description: crownDevelopment.description,
		stage: crownDevelopment.Stage?.displayName,
		procedure: crownDevelopment.Procedure?.displayName,
		applicationAcceptedDate: formatDate(crownDevelopment.applicationAcceptedDate, { format: 'd MMMM yyyy' }),
		representationsPeriodStartDate: formatDate(crownDevelopment.representationsPeriodStartDate, {
			format: 'd MMMM yyyy'
		}),
		representationsPeriodEndDate: formatDate(crownDevelopment.representationsPeriodEndDate, {
			format: 'd MMMM yyyy'
		}),
		representationsPeriodStartDateTime: formatDate(crownDevelopment.representationsPeriodStartDate, {
			format: `d MMMM yyyy 'at' h:mmaaa`
		}),
		representationsPeriodEndDateTime: formatDate(crownDevelopment.representationsPeriodEndDate, {
			format: `d MMMM yyyy 'at' h:mmaaa`
		}),
		representationsPublishDate: formatDate(crownDevelopment.representationsPublishDate, {
			format: 'd MMMM yyyy'
		}),
		decisionDate: formatDate(crownDevelopment.decisionDate, { format: 'd MMMM yyyy' }),
		decisionOutcome: crownDevelopment.DecisionOutcome?.displayName,
		crownDevelopmentContactEmail: contactEmail,
		containsDistressingContent: crownDevelopment.containsDistressingContent
	} as CrownDevelopmentView;

	const withdrawnDateFormatted = formatDate(crownDevelopment.withdrawnDate, { format: 'd MMMM yyyy' });
	if (withdrawnDateFormatted) {
		fields.withdrawnDate = withdrawnDateFormatted;
	}

	if (crownDevelopment.SecondaryLpa && crownDevelopment.SecondaryLpa.name) {
		fields.SecondaryLpa = crownDevelopment.SecondaryLpa;
	}

	if (isInquiry(crownDevelopment.procedureId)) {
		fields.isInquiry = true;
		fields.inquiryDate = formatDate(crownDevelopment.Event?.date, { format: 'd MMMM yyyy' });
		fields.inquiryVenue = crownDevelopment.Event?.venue;
		fields.inquiryStatementsDate = formatDate(crownDevelopment.Event?.statementsDate, {
			format: 'd MMMM yyyy'
		});
		fields.inquiryProofsOfEvidenceDate = formatDate(crownDevelopment.Event?.proofsOfEvidenceDate, {
			format: 'd MMMM yyyy'
		});
	} else if (isHearing(crownDevelopment.procedureId)) {
		fields.isHearing = true;
		fields.hearingDate = formatDate(crownDevelopment.Event?.date, { format: 'd MMMM yyyy' });
		fields.hearingVenue = crownDevelopment.Event?.venue;
	}

	if (crownDevelopment.SiteAddress) {
		fields.siteAddress = addressToViewModel(crownDevelopment.SiteAddress);
	}
	if (crownDevelopment.siteEasting && crownDevelopment.siteNorthing) {
		fields.siteCoordinates = {
			easting: crownDevelopment.siteEasting.toString().padStart(6, '0'),
			northing: crownDevelopment.siteNorthing.toString().padStart(6, '0')
		};
	}
	if (crownDevelopment.SubType) {
		fields.applicationSubType = crownDevelopment.SubType?.displayName ?? '';
	}

	if (Object.prototype.hasOwnProperty.call(crownDevelopment, 'withdrawnDate')) {
		fields.applicationStatus = getApplicationStatus(crownDevelopment.withdrawnDate);
	}

	return fields;
}

export interface CrownDevelopmentExtendedView extends BaseDevelopmentView {
	applicantOrganisations: string;
	referenceLink: string;
	withdrawnDate: string | undefined;
}

export const crownDevelopmentSelect = {
	...baseCrownDevelopmentSelect,
	withdrawnDate: true,
	Organisations: {
		select: {
			role: true,
			Organisation: {
				select: {
					name: true
				}
			}
		}
	}
} satisfies Prisma.CrownDevelopmentSelect;

export type CrownDevelopmentCaseListPayload = ValidatedDbPayload<
	Prisma.CrownDevelopmentGetPayload<{ select: typeof crownDevelopmentSelect }>
>;

type ExtendedCrownFields = Omit<CrownDevelopmentExtendedView, keyof BaseDevelopmentView>;

/**
 * Crown Dev list view model formatter, formatting extended fields from Crown Development View
 *
 * @param crownDevelopment - The main db query input
 */
export function applicationListViewFormattingFunction(
	crownDevelopment: CrownDevelopmentCaseListPayload
): ExtendedCrownFields {
	let applicantOrganisations = '';

	if (crownDevelopment.Organisations?.length) {
		applicantOrganisations = crownDevelopment.Organisations.filter(
			(org) => org.role === ORGANISATION_ROLES_ID.APPLICANT
		)
			.flatMap((item) => (item.Organisation?.name ? [item.Organisation.name] : []))
			.join(', ');
	}

	const withdrawnDateFormatted = formatDate(crownDevelopment.withdrawnDate, { format: 'd MMMM yyyy' });

	return {
		applicantOrganisations,
		referenceLink: `<a class="govuk-link" href="/applications/${crownDevelopment.id}/application-information">${insertWbr(crownDevelopment.reference)}</a>`,
		withdrawnDate: withdrawnDateFormatted || undefined
	};
}

export type CrownDevelopmentWithRelations = Prisma.CrownDevelopmentGetPayload<{
	include: {
		Type: true;
		SubType: true;
		ApplicantContact: true;
		Lpa: true;
		SecondaryLpa: true;
		Stage: true;
		Procedure: true;
		DecisionOutcome: true;
		Event: true;
		SiteAddress: true;
		Organisations: { include: { Organisation: true } };
	};
}>;

export function applicationUpdateToTimelineItem(
	applicationUpdate: Prisma.ApplicationUpdateGetPayload<object>
): { details: string; firstPublished: string } | undefined {
	if (!applicationUpdate) {
		return;
	}
	return {
		details: applicationUpdate.details,
		firstPublished: formatDate(applicationUpdate.firstPublished, { format: 'd MMMM yyyy' })
	};
}
