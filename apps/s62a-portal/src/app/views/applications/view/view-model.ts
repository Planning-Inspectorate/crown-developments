import type { Prisma } from '@pins/crowndev-database/src/client/client.ts';
import { ORGANISATION_ROLES_ID } from '@pins/crowndev-database/src/seed/data-static.ts';
import {
	APPLICANT_TYPE_ID,
	MAJOR_OR_NON_MAJOR_ID,
	OUTCOME_TYPE_ID
} from '@pins/crowndev-database/src/seed/s62a/data-static.ts';
import { type ApplicationPublishStatus, getApplicationStatus } from '@pins/crowndev-lib/util/applications.ts';
import { formatBytes } from '@pins/crowndev-lib/util/file.ts';
import { isHearing } from '@pins/crowndev-lib/util/shared-view-model.ts';
import { addressToViewModel, formatDateForDisplay } from '@planning-inspectorate/dynamic-forms';
import { formatInTimeZone } from 'date-fns-tz';

export type DocumentViewModel = {
	id: string;
	fileName: string;
	fileType: string;
	size: string;
	date: string;
	caseId: string;
	category: string;
	categoryId: string;
	isPreview: boolean;
};

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
		Documents: {
			where: {
				publishDate: {
					lte: Date;
				};
				deletedAt: null;
			};
			include: {
				DocumentCategory: true;
			};
		};
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
	representationsPeriodStartDateTime?: string;
	representationsPeriodEndDateTime?: string;
	targetDecisionDate?: string;
	extendedTargetDecisionDate?: string;
	decisionDate?: string;
	withdrawnDate?: string;

	showHearing: boolean;
	hearingDate?: string;
	hearingVenue?: string;

	showDecision: boolean;
	decisionOutcome?: string;

	representationsPublishDate?: string;
	isMajor: boolean;

	documents: DocumentViewModel[];
};

type RawDocumentViewModel = Omit<DocumentViewModel, 'date'> & { date: Date | '' };
export type S62aCaseRawView = Omit<
	S62aCaseView,
	| 'applicationValidDate'
	| 'representationsPeriodStartDateTime'
	| 'representationsPeriodEndDateTime'
	| 'targetDecisionDate'
	| 'extendedTargetDecisionDate'
	| 'decisionDate'
	| 'withdrawnDate'
	| 'hearingDate'
	| 'representationsPublishDate'
	| 'documents'
> & {
	applicationValidDate?: Date;
	representationsPeriodStartDateTime?: Date;
	representationsPeriodEndDateTime?: Date;
	targetDecisionDate?: Date;
	extendedTargetDecisionDate?: Date;
	decisionDate?: Date;
	withdrawnDate?: Date;
	hearingDate?: Date;
	representationsPublishDate: Date | null;
	documents: RawDocumentViewModel[];
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
 * Creates the raw view model for the s62a case.
 */
export function s62aCaseToRawViewModel(s62aCase: S62aCaseWithRelations): S62aCaseRawView {
	const { S62aDates, SiteAddress, S62aEvent, Documents } = s62aCase;

	const hasRepPeriod = !!(s62aCase.representationsPeriodStartDate && s62aCase.representationsPeriodEndDate);
	const isCaseHearing = isHearing(s62aCase.procedureId);
	const hearingDate = S62aEvent?.hearingDate ?? undefined;
	const hearingVenue = S62aEvent?.venue;

	const isDecision = s62aCase.outcomeTypeId === OUTCOME_TYPE_ID.DECISION;

	const viewModel: S62aCaseRawView = {
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
		applicationValidDate: S62aDates?.applicationValidDate ?? undefined,
		targetDecisionDate: S62aDates?.targetDecisionDate ?? undefined,
		extendedTargetDecisionDate: S62aDates?.extendedTargetDecisionDate ?? undefined,
		decisionDate: S62aDates?.decisionDate ?? undefined,
		withdrawnDate: S62aDates?.withdrawnDate ?? undefined,
		representationsPeriodStartDateTime: hasRepPeriod
			? (s62aCase.representationsPeriodStartDate ?? undefined)
			: undefined,
		representationsPeriodEndDateTime: hasRepPeriod ? (s62aCase.representationsPeriodEndDate ?? undefined) : undefined,

		// Hearing
		hearingDate: isCaseHearing ? hearingDate : undefined,
		hearingVenue: isCaseHearing ? hearingVenue || undefined : undefined,
		showHearing: !!(isCaseHearing && (hearingDate || hearingVenue)),

		// Outcome / Decision
		showDecision: !!(isDecision && S62aDates?.decisionDate),
		decisionOutcome: s62aCase.DecisionOutcome?.displayName || undefined,

		// HYS
		representationsPublishDate: s62aCase.representationsPublishDate,
		isMajor: s62aCase.classificationId === MAJOR_OR_NON_MAJOR_ID.MAJOR,

		// Documents
		documents: documentsToViewModel(Documents)
	};

	return viewModel;
}

/**
 * Creates the display-ready view model for the s62a case.
 */
export function s62aCaseToViewModel(s62aCase: S62aCaseWithRelations): S62aCaseView {
	const rawViewModel = s62aCaseToRawViewModel(s62aCase);

	return {
		...rawViewModel,
		applicationValidDate: formatDate(rawViewModel.applicationValidDate, 'd MMMM yyyy'),
		targetDecisionDate: formatDate(rawViewModel.targetDecisionDate, 'd MMMM yyyy'),
		extendedTargetDecisionDate: formatDate(rawViewModel.extendedTargetDecisionDate, 'd MMMM yyyy'),
		decisionDate: formatDate(rawViewModel.decisionDate, 'd MMMM yyyy'),
		withdrawnDate: formatDate(rawViewModel.withdrawnDate, 'd MMMM yyyy'),
		representationsPeriodStartDateTime: formatDate(
			rawViewModel.representationsPeriodStartDateTime,
			`d MMMM yyyy 'at' h:mmaaa`
		),
		representationsPeriodEndDateTime: formatDate(
			rawViewModel.representationsPeriodEndDateTime,
			`d MMMM yyyy 'at' h:mmaaa`
		),
		hearingDate: formatDate(rawViewModel.hearingDate, `d MMMM yyyy 'at' h:mmaaa`),
		representationsPublishDate: formatDate(rawViewModel.representationsPublishDate, 'd MMMM yyyy'),
		documents: rawViewModel.documents.map((document) => ({
			...document,
			date: document.date ? formatInTimeZone(document.date, 'Europe/London', 'dd MMM yyyy') : ''
		}))
	};
}

export const tabText = {
	writtenRepresentations: 'Written representations (Comments and feedback)'
};

/**
 * Builds the documents view model needed for the docs page
 */
function documentsToViewModel(
	documents: Prisma.DocumentGetPayload<{ include: { DocumentCategory: true } }>[]
): RawDocumentViewModel[] {
	if (!documents) return [];
	return documents.map((document) => {
		return {
			id: document.id,
			fileName: document.fileName,
			fileType: getFileExtension(document.fileName),
			size: formatBytes(Number(document.size)),
			date: document.publishDate ?? '',
			caseId: document.s62aCaseId,
			category: document.DocumentCategory?.displayName || '',
			categoryId: document.categoryId || '',
			isPreview: ['image/png', 'image/jpeg', 'application/pdf', 'image/gif', 'image/bmp'].includes(document.mimeType)
		};
	});
}

function getFileExtension(fileName: string): string {
	return fileName.split('.').pop()?.toUpperCase() || '';
}
