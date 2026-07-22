import type { Prisma } from '@pins/crowndev-database/src/client/client.ts';
import { SITE_AREA_UNIT_ID } from '@pins/crowndev-database/src/seed/s62a/data-static.ts';
import { addressToViewModel } from '@pins/crowndev-lib/util/address.ts';
import type { YesNo } from '@pins/crowndev-lib/util/types.ts';
import { type Address, booleanToYesNoValue } from '@planning-inspectorate/dynamic-forms';

export const S62A_DATE_FIELDS = Object.freeze([
	'notificationReceivedDate',
	'applicationReceivedDate',
	'applicationAcknowledgedDate',
	'furtherInformationRequestedDate',
	'agreedForAdditionalInformationDate',
	'applicationValidDate',
	'validLettersSentDate',
	'lpaQuestionnaireSentDate',
	'lpaQuestionnaireReceivedDate',
	'targetPublishDate',
	'publishDate',
	'pressNoticeDate',
	'neighboursNotifiedByLpaDate',
	'lpaInterestedPartiesDeadlineDate',
	'siteNoticeByLpaDate',
	'interestedPartiesPressNoticeDeadlineDate',
	'mineralApplicationsDate',
	'interimFindingsDate',
	's106SubmittedDate',
	'targetDecisionDate',
	'extendedTargetDecisionDate',
	'recoveredDate',
	'withdrawnDate',
	'turnedAwayDate'
] as const);

export const FEE_BOOLEAN_FIELDS = Object.freeze([
	'hasPreApplicationFee',
	'hasApplicationFee',
	'eligibleForFeeRefund'
] as const);
export const FEE_NUMBER_FIELDS = Object.freeze([
	'preApplicationFee',
	'applicationFee',
	'applicationFeeRefundAmount'
] as const);
export const FEE_STRING_FIELDS = Object.freeze(['customerNumber'] as const);
export const FEE_DATE_FIELDS = Object.freeze([
	'chargingScheduleSentDate',
	'invoiceDate',
	'preApplicationFeeReceivedDate',
	'applicationFeeReceivedDate',
	'applicationFeeRefundDate'
] as const);

export type S62aCaseDbModel = Prisma.S62aCaseGetPayload<{
	include: {
		S62aStatus: true;
		SiteAddress: true;
		S62aDates: true;
		S62aFees: true;
	};
}>;

export interface S62aCaseViewModel {
	id: string;
	reference: string;
	developmentDescription: string;
	s62aStatusId?: string;
	typeId: string;
	applicationPhaseId?: string | null;
	classificationId?: string | null;
	lpaId: string | null;
	hasSecondaryLpa: YesNo;
	secondaryLpaId?: string | null;
	siteAddress?: Address;
	siteNorthing?: number | null;
	siteEasting?: number | null;
	siteAreaHectares?: number | null;
	siteAreaSquareMetres?: number | null;
	expectedSubmissionDate: Date;
	specialismId?: string | null;
	inspectorBandId?: string | null;
	subTypeId?: string | null;
	siteIsVisibleFromPublicLand?: YesNo;
	likelyIssues?: string | null;
	representationsPeriod?: {
		start?: Date;
		end?: Date;
	};
	representationsPublishDate?: Date;

	notificationReceivedDate?: Date;
	applicationReceivedDate?: Date;
	applicationAcknowledgedDate?: Date;
	furtherInformationRequestedDate?: Date;
	agreedForAdditionalInformationDate?: Date;
	applicationValidDate?: Date;
	validLettersSentDate?: Date;
	lpaQuestionnaireSentDate?: Date;
	lpaQuestionnaireReceivedDate?: Date;
	targetPublishDate?: Date;
	publishDate?: Date;
	pressNoticeDate?: Date;
	neighboursNotifiedByLpaDate?: Date;
	lpaInterestedPartiesDeadlineDate?: Date;
	siteNoticeByLpaDate?: Date;
	interestedPartiesPressNoticeDeadlineDate?: Date;
	mineralApplicationsDate?: Date;
	interimFindingsDate?: Date;
	s106SubmittedDate?: Date;
	targetDecisionDate?: Date;
	extendedTargetDecisionDate?: Date;
	recoveredDate?: Date;
	withdrawnDate?: Date;
	turnedAwayDate?: Date;
	reconsultationDetailsDate?: {
		start?: Date;
		end?: Date;
	};

	hasPreApplicationFee?: YesNo;
	preApplicationFee?: number;
	chargingScheduleSentDate?: Date;
	invoiceDate?: Date;
	preApplicationFeeReceivedDate?: Date;
	customerNumber?: string;

	hasApplicationFee?: YesNo;
	applicationFee?: number;
	applicationFeeReceivedDate?: Date;

	eligibleForFeeRefund?: YesNo;
	applicationFeeRefundAmount?: number;
	applicationFeeRefundDate?: Date;
}

/**
 * Optional boolean fields that need converting to YesNo | undefined
 */
const BOOLEAN_FIELDS = Object.freeze(['siteIsVisibleFromPublicLand'] as const);

/**
 * These integer fields are in the SaveModel as strings because they are in a multi-field input.
 * TODO update multi-field input to allow number fields CROWN-1620
 */
const INTEGER_STRING_FIELDS = Object.freeze(['siteNorthing', 'siteEasting'] as const);

/**
 * Fields that do not need mapping to (or from) the view model
 */
const DIRECT_UNMAPPED_FIELDS = Object.freeze(['likelyIssues', 'representationsPublishDate'] as const);

/**
 * Fields that represent foreign key relations in the database and are included in the view model
 * as simple ID fields for ease of use in the UI.
 */
const RELATION_ID_FIELDS = Object.freeze([
	's62aStatusId',
	'applicationPhaseId',
	'classificationId',
	'secondaryLpaId',
	'specialismId',
	'inspectorBandId',
	'subTypeId'
] as const);

// Create a union type of all valid dynamic fields
type DirectUnmappedField =
	| (typeof DIRECT_UNMAPPED_FIELDS)[number]
	| (typeof RELATION_ID_FIELDS)[number]
	| (typeof INTEGER_STRING_FIELDS)[number];

/**
 * Assign an S62aCase field that maps directly to the view model,
 * allowing null values from the database to be set as undefined in the view model.
 */
function assignNullableDirectField<K extends DirectUnmappedField>(
	viewModel: S62aCaseViewModel,
	dbCase: S62aCaseDbModel,
	field: K
) {
	const value = dbCase[field];
	viewModel[field] = (value === null ? undefined : value) as S62aCaseViewModel[K];
}

/**
 * Pure function to map a database record back to the frontend View Model.
 */
export function s62aCaseToViewModel(dbCase: S62aCaseDbModel): S62aCaseViewModel {
	const viewModel: S62aCaseViewModel = {
		id: dbCase.id,
		reference: dbCase.reference,
		developmentDescription: dbCase.description,
		typeId: dbCase.typeId,
		lpaId: dbCase.lpaId,
		hasSecondaryLpa: booleanToYesNoValue(dbCase.hasSecondaryLpa),
		expectedSubmissionDate: dbCase.expectedSubmissionDate
	};

	for (const field of BOOLEAN_FIELDS) {
		viewModel[field] = typeof dbCase[field] === 'boolean' ? booleanToYesNoValue(dbCase[field]) : undefined;
	}

	for (const field of [...RELATION_ID_FIELDS, ...DIRECT_UNMAPPED_FIELDS, ...INTEGER_STRING_FIELDS]) {
		assignNullableDirectField(viewModel, dbCase, field);
	}

	if (dbCase.representationsPeriodStartDate || dbCase.representationsPeriodEndDate) {
		viewModel.representationsPeriod = {};

		if (dbCase.representationsPeriodStartDate) {
			viewModel.representationsPeriod.start = dbCase.representationsPeriodStartDate;
		}
		if (dbCase.representationsPeriodEndDate) {
			viewModel.representationsPeriod.end = dbCase.representationsPeriodEndDate;
		}
	}

	if (dbCase.siteAreaInSquareMetres) {
		if (dbCase.siteAreaOriginalUnitId === SITE_AREA_UNIT_ID.METRES_SQUARED) {
			viewModel.siteAreaSquareMetres = dbCase.siteAreaInSquareMetres.toNumber();
		} else {
			viewModel.siteAreaHectares = Number(dbCase.siteAreaInSquareMetres.dividedBy(10000).toFixed(4));
		}
	}

	if (dbCase.SiteAddress) {
		viewModel.siteAddress = addressToViewModel(dbCase.SiteAddress);
	}

	if (dbCase.S62aDates) {
		for (const field of S62A_DATE_FIELDS) {
			const dateValue = dbCase.S62aDates[field];
			if (dateValue) {
				viewModel[field] = dateValue;
			}
		}

		if (dbCase.S62aDates.reconsultationDetailsSentDate || dbCase.S62aDates.reconsultationDetailsDeadlineDate) {
			viewModel.reconsultationDetailsDate = {};

			if (dbCase.S62aDates.reconsultationDetailsSentDate) {
				viewModel.reconsultationDetailsDate.start = dbCase.S62aDates.reconsultationDetailsSentDate;
			}
			if (dbCase.S62aDates.reconsultationDetailsDeadlineDate) {
				viewModel.reconsultationDetailsDate.end = dbCase.S62aDates.reconsultationDetailsDeadlineDate;
			}
		}
	}

	if (dbCase.S62aFees) {
		for (const field of FEE_BOOLEAN_FIELDS) {
			const val = dbCase.S62aFees[field];
			if (typeof val === 'boolean') {
				viewModel[field] = booleanToYesNoValue(val);
			}
		}

		for (const field of FEE_NUMBER_FIELDS) {
			const val = dbCase.S62aFees[field];
			if (val) {
				viewModel[field] = val.toNumber();
			}
		}

		for (const field of FEE_DATE_FIELDS) {
			const val = dbCase.S62aFees[field];
			if (val) {
				viewModel[field] = val;
			}
		}

		for (const field of FEE_STRING_FIELDS) {
			const val = dbCase.S62aFees[field];
			if (val) {
				viewModel[field] = val;
			}
		}
	}

	return viewModel;
}
