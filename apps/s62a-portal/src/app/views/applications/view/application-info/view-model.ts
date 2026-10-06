import type { Prisma } from '@pins/crowndev-database/src/client/client.ts';
import { ORGANISATION_ROLES_ID } from '@pins/crowndev-database/src/seed/data-static.ts';
import { APPLICANT_TYPE_ID, OUTCOME_TYPE_ID } from '@pins/crowndev-database/src/seed/s62a/data-static.ts';
import { type ApplicationPublishStatus, getApplicationStatus } from '@pins/crowndev-lib/util/applications.ts';
import { isHearing } from '@pins/crowndev-lib/util/shared-view-model.ts';
import { addressToViewModel, formatDateForDisplay } from '@planning-inspectorate/dynamic-forms';

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
		S62aEvent: true;
		DecisionOutcome: true;
	};
}>;

export type S62aCaseView = {
	id: string;
	reference: string;
	applicationType: string | null;
	lpaName: string;
	applicants: string[] | [];
	description: string;
	applicationStatus?: ApplicationPublishStatus;
	secondaryLpaName?: string;
	siteAddress?: string;
	siteCoordinates?: { easting: string; northing: string };
	procedure?: string;

	applicationValidDate?: string;
	representationPeriodStartDateTime?: string;
	representationPeriodEndDateTime?: string;
	targetDecisionDate?: string;
	extendedTargetDecisionDate?: string;
	decisionDate?: string;
	withdrawnDate?: string;

	showHearing: boolean;
	hearingDate?: string;
	hearingVenue?: string;

	showDecision: boolean;
	decisionOutcome?: string;
};

/**
 * Safely format dates if they exist
 */
const formatDate = (date: Date | string | null | undefined, formatStr: string) =>
	date ? formatDateForDisplay(date, { format: formatStr }) : undefined;

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
	const { S62aDates, SiteAddress, S62aEvent } = s62aCase;

	const hasRepPeriod = !!(s62aCase.representationsPeriodStartDate && s62aCase.representationsPeriodEndDate);
	const isCaseHearing = isHearing(s62aCase.procedureId);
	const hearingDate = formatDate(S62aEvent?.hearingDate, `d MMMM yyyy 'at' h:mmaaa`);
	const hearingVenue = S62aEvent?.venue;

	const isDecision = s62aCase.outcomeTypeId === OUTCOME_TYPE_ID.DECISION;

	return {
		id: s62aCase.id,
		reference: s62aCase.reference,

		// About this application
		applicationType: s62aCase.Type?.displayName,
		lpaName: s62aCase.Lpa?.name,
		applicants: formatApplicants(s62aCase),
		description: s62aCase.description,
		secondaryLpaName: s62aCase.SecondaryLpa?.name || undefined,
		procedure: s62aCase.Procedure?.displayName || undefined,
		applicationStatus:
			S62aDates && 'withdrawnDate' in S62aDates ? getApplicationStatus(S62aDates.withdrawnDate) : undefined,
		siteAddress: SiteAddress?.postcode ? addressToViewModel(SiteAddress) : undefined,
		siteCoordinates:
			s62aCase.siteEasting && s62aCase.siteNorthing
				? {
						easting: s62aCase.siteEasting.toString().padStart(6, '0'),
						northing: s62aCase.siteNorthing.toString().padStart(6, '0')
					}
				: undefined,

		// Key Dates
		applicationValidDate: formatDate(S62aDates?.applicationValidDate, 'd MMMM yyyy'),
		targetDecisionDate: formatDate(S62aDates?.targetDecisionDate, 'd MMMM yyyy'),
		extendedTargetDecisionDate: formatDate(S62aDates?.extendedTargetDecisionDate, 'd MMMM yyyy'),
		decisionDate: formatDate(S62aDates?.decisionDate, 'd MMMM yyyy'),
		withdrawnDate: formatDate(S62aDates?.withdrawnDate, 'd MMMM yyyy'),
		representationPeriodStartDateTime: hasRepPeriod
			? formatDate(s62aCase.representationsPeriodStartDate, `d MMMM yyyy 'at' h:mmaaa`)
			: undefined,
		representationPeriodEndDateTime: hasRepPeriod
			? formatDate(s62aCase.representationsPeriodEndDate, `d MMMM yyyy 'at' h:mmaaa`)
			: undefined,

		// Hearing
		hearingDate: isCaseHearing ? hearingDate : undefined,
		hearingVenue: isCaseHearing ? hearingVenue || undefined : undefined,
		showHearing: !!(isCaseHearing && (hearingDate || hearingVenue)),

		// Outcome / Decision
		showDecision: !!(isDecision && S62aDates?.decisionDate),
		decisionOutcome: s62aCase.DecisionOutcome?.displayName || undefined
	};
}
