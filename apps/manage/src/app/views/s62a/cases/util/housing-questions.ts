import { COMPONENT_TYPES, NumericValidator, RequiredValidator } from '@planning-inspectorate/dynamic-forms';
import {
	OCCUPANCY_TYPES,
	UNIT_TYPES,
	UNIT_TYPES_BY_OCCUPANCY
} from '@pins/crowndev-database/src/seed/s62a/data-static.ts';
import { CUSTOM_COMPONENTS } from '@pins/crowndev-lib/forms/custom-components/index.ts';
import type { CardFormatContext } from '@pins/crowndev-lib/forms/custom-components/manage-list/card/question.ts';
import MultiFieldInputValidator from '@pins/crowndev-lib/validators/multi-field-input-validator.js';
import RequiredGroupValidator from '@pins/crowndev-lib/validators/required-group-validator.ts';
import UniqueListFieldValidator from '@pins/crowndev-lib/validators/unique-list-field-validator.ts';
import { BEDROOM_BANDS, HOUSING_BEDROOM_FIELDS, type ResidentialHousingItem } from '../view/view-model.ts';
import {
	occupancyTotalFieldName,
	sumBedroomBands,
	totalUnitsFieldName,
	type HousingSide,
	type ResidentialSideTotals
} from './residential-totals.ts';
import { lowerFirst } from '@pins/crowndev-lib/util/string.ts';

const BEDROOM_INPUT_FIELDS = BEDROOM_BANDS.map(({ fieldName, label }, index) => ({
	fieldName,
	label,
	classes: 'govuk-input--width-5',
	inputmode: 'numeric',
	pattern: '[0-9]*',
	suffix: { text: 'units' },
	formatPrefix: `${label}: `,
	formatJoinString: index === BEDROOM_BANDS.length - 1 ? '' : ', '
}));

const OCCUPANCY_ORDER = new Map<string, number>(OCCUPANCY_TYPES.map((type) => [type.id, type.order]));
const UNIT_TYPE_ORDER = new Map<string, number>(UNIT_TYPES.map((type) => [type.id, type.order]));

/** Resolves a lookup id to its display name for error messages. */
function lookupDisplayName(list: { id: string; displayName: string }[], id: unknown): string {
	if (typeof id !== 'string') {
		return '';
	}

	return list.find((entry) => entry.id === id)?.displayName ?? id;
}

/** An entry part-way through being added has no order yet, and sorts to the end. */
function compareOrder(a?: number, b?: number): number {
	if (a === undefined && b === undefined) return 0;
	if (a === undefined) return 1;
	if (b === undefined) return -1;

	return a - b;
}

/** Looks up a display order, tolerating a lookup id that isn't answered yet. */
function orderOf(orders: Map<string, number>, id: unknown): number | undefined {
	return typeof id === 'string' ? orders.get(id) : undefined;
}

/**
 * Groups cards by occupancy, then unit type, matching the DB ordering so an
 * entry added this session lands beside its siblings rather than at the end.
 */
export function compareHousingItems(a: Record<string, unknown>, b: Record<string, unknown>): number {
	const occupancy = compareOrder(
		orderOf(OCCUPANCY_ORDER, a.occupancyTypeId),
		orderOf(OCCUPANCY_ORDER, b.occupancyTypeId)
	);

	if (occupancy !== 0) return occupancy;

	return compareOrder(orderOf(UNIT_TYPE_ORDER, a.unitTypeId), orderOf(UNIT_TYPE_ORDER, b.unitTypeId));
}

/**
 * Starter homes and self-build offer a reduced set of unit types.
 *
 * Filtering the options rather than the rendered list means the auto-added
 * ValidOptionValidator rejects a value that isn't valid for the chosen
 * occupancy. No item id means the check page or tab, where every option must
 * remain present so saved entries still resolve their display name.
 */
export function getUnitTypeOptions(items: ResidentialHousingItem[], manageListItemId?: string | null) {
	const occupancyTypeId = manageListItemId
		? items.find((item) => item.id === manageListItemId)?.occupancyTypeId
		: undefined;

	const allowed = occupancyTypeId ? UNIT_TYPES_BY_OCCUPANCY[occupancyTypeId] : undefined;
	const unitTypes = allowed ? UNIT_TYPES.filter((type) => allowed.includes(type.id)) : UNIT_TYPES;

	return unitTypes.map((type) => ({ text: type.displayName, value: type.id }));
}

export interface HousingQuestionsParams {
	side: HousingSide;
	/** Entries for this side, merged with session data so a new entry's occupancy is visible */
	items: ResidentialHousingItem[];
	manageListItemId?: string | null;
	isQuestionView?: boolean;
}

/**
 * The existing and proposed housing add-to-lists are identical apart from their
 * wording and which side of the tab they belong to.
 */
export function housingQuestions({ side, items, manageListItemId, isQuestionView }: HousingQuestionsParams) {
	const listFieldName = side === 'existing' ? 'manageExistingHousing' : 'manageProposedHousing';
	const label = `${side} housing`;
	const sideTitle = side === 'existing' ? 'Existing' : 'Proposed';

	return {
		manageHousing: {
			type: CUSTOM_COMPONENTS.CARD_MANAGE_LIST,
			title: isQuestionView ? `Check ${label} details` : `${sideTitle} housing`,
			question: `Check ${label} details`,
			fieldName: listFieldName,
			url: 'housing',
			titleSingular: `${label} entry`,
			emptyName: `${side} house`,
			emptyNamePlural: `${side} houses`,
			cardTitle: (_item: Record<string, unknown>, { getFormatted }: CardFormatContext) =>
				[getFormatted('occupancyTypeId'), getFormatted('unitTypeId')].filter(Boolean).join(' - '),
			sortItems: compareHousingItems,
			rows: [
				{ label: 'Total number of units', format: (item: Record<string, unknown>) => String(sumBedroomBands(item)) },
				...BEDROOM_BANDS.map((band) => ({
					label: 'cardLabel' in band ? band.cardLabel : band.label,
					fieldName: band.fieldName
				}))
			]
		},
		occupancyType: {
			type: COMPONENT_TYPES.RADIO,
			title: 'Occupancy type',
			question: `Which is the type of occupancy for ${label}?`,
			fieldName: 'occupancyTypeId',
			url: 'occupancy',
			validators: [new RequiredValidator(`Select the type of occupancy for ${label}`)],
			options: OCCUPANCY_TYPES.map((type) => ({ text: type.displayName, value: type.id })),
			viewData: { continueButtonText: 'Continue' }
		},
		unitType: {
			type: COMPONENT_TYPES.RADIO,
			title: 'Unit type',
			question: `Which is the type of unit for ${label}?`,
			fieldName: 'unitTypeId',
			url: 'unit-type',
			validators: [
				new RequiredValidator(`Select the type of unit for ${label}`),
				new UniqueListFieldValidator({
					listFieldName,
					alsoMatchOn: ['occupancyTypeId'],
					displayNameFor: (unitTypeId) => lookupDisplayName(UNIT_TYPES, unitTypeId),
					buildErrorMessage: (displayName, matchedItem) =>
						`You have already added ${lookupDisplayName(OCCUPANCY_TYPES, matchedItem.occupancyTypeId)}` +
						` - ${displayName}. Change the existing entry or choose a different combination.`
				})
			],
			options: getUnitTypeOptions(items, manageListItemId),
			viewData: { continueButtonText: 'Continue' }
		},
		bedrooms: {
			type: COMPONENT_TYPES.MULTI_FIELD_INPUT,
			title: 'Bedrooms',
			question: `How many units per number of bedrooms are there for ${label}?`,
			fieldName: `${side}Bedrooms`,
			url: 'bedrooms',
			inputFields: BEDROOM_INPUT_FIELDS,
			validators: [
				new RequiredGroupValidator({
					fieldNames: HOUSING_BEDROOM_FIELDS,
					errorMessage: 'Enter a number of bedrooms'
				}),
				new MultiFieldInputValidator({
					fields: HOUSING_BEDROOM_FIELDS.map((fieldName) => ({
						fieldName,
						validators: [
							new NumericValidator({
								regex: /^$|^\d+$/,
								regexMessage: 'The number of units must be a whole number'
							})
						]
					}))
				})
			],
			viewData: { continueButtonText: 'Continue' }
		}
	};
}

/** A calculated row - shown on the tab, never navigable, never saved. */
function derivedRow(fieldName: string, title: string, url: string) {
	return {
		type: COMPONENT_TYPES.SINGLE_LINE_INPUT,
		title,
		question: title,
		fieldName,
		url,
		editable: false
	};
}

/**
 * The derived rows for one side: the side total, then one row per occupancy
 * present. An occupancy with no entries produces no question, so no empty rows
 * reach the tab.
 */
export function residentialTotalQuestions(side: HousingSide, totals: ResidentialSideTotals) {
	if (totals.occupancies.length === 0) {
		return {};
	}

	const sideFieldName = totalUnitsFieldName(side);

	const occupancyRows = totals.occupancies.map((occupancy) => {
		const fieldName = occupancyTotalFieldName(side, occupancy.occupancyTypeId);

		return [
			fieldName,
			derivedRow(
				fieldName,
				`Total ${lowerFirst(occupancy.displayName)} units`,
				`total-${side}-units-${occupancy.occupancyTypeId}`
			)
		] as const;
	});

	return {
		[sideFieldName]: derivedRow(sideFieldName, `Total ${side} residential units`, `total-${side}-units`),
		...Object.fromEntries(occupancyRows)
	};
}
