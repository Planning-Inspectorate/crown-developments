import type { Prisma } from '@pins/crowndev-database/src/client/client.ts';
import { SITE_AREA_UNIT_ID } from '@pins/crowndev-database/src/seed/s62a/data-static.ts';
import { addressToViewModel } from '@pins/crowndev-lib/util/address.ts';
import type { YesNo } from '@pins/crowndev-lib/util/types.ts';
import { type Address, booleanToYesNoValue } from '@planning-inspectorate/dynamic-forms';

export type S62aCaseDbModel = Prisma.S62aCaseGetPayload<{
	include: {
		S62aStatus: true;
		SiteAddress: true;
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
	siteIsVisibleFromPublicLand?: YesNo; // Now optional
	likelyIssues?: string | null;
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
const DIRECT_UNMAPPED_FIELDS = Object.freeze(['likelyIssues'] as const);

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

	return viewModel;
}
