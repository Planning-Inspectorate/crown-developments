import {
	COMPONENT_TYPES,
	ConditionalRequiredValidator,
	NumericValidator,
	RequiredValidator
} from '@planning-inspectorate/dynamic-forms';
import {
	FLOORSPACE_SET_ID,
	SUBTYPE_PAGE_BY_USE_CLASS,
	USE_CLASSES,
	USE_CLASS_ID,
	USE_CLASS_SUBTYPES,
	USE_CLASS_SUBTYPE_ID,
	USE_CLASSES_WITH_ROOMS
} from '@pins/crowndev-database/src/seed/s62a/data-static.ts';
import { CUSTOM_COMPONENTS } from '@pins/crowndev-lib/forms/custom-components/index.ts';
import type { CardFormatContext } from '@pins/crowndev-lib/forms/custom-components/manage-list/card/question.ts';
import MultiFieldInputValidator from '@pins/crowndev-lib/validators/multi-field-input-validator.js';
import {
	areaFieldName,
	areaFieldNames,
	AREA_FIELDS,
	FLOORSPACE_LABELS,
	ROOMS_FIELDS,
	ROOMS_LABELS
} from '../view/view-model.ts';
import { ConditionalLengthValidator } from '@pins/crowndev-lib/validators/conditional-length-validator.ts';

const WHOLE_NUMBER = /^$|^\d+$/;
const FLOORSPACE_ERROR = 'The floorspace must be a whole number of square metres';
const ROOMS_ERROR = 'The number of rooms must be a whole number';

/** The four square-metre inputs a floorspace page shows, for one set. */
function areaInputFields(setId: string) {
	return AREA_FIELDS.map((field, index) => ({
		fieldName: areaFieldName(setId, field),
		label: FLOORSPACE_LABELS[index],
		classes: 'govuk-input--width-5',
		inputmode: 'numeric',
		pattern: '[0-9]*',
		suffix: { text: 'm²' },
		formatPrefix: `${FLOORSPACE_LABELS[index]}: `,
		formatJoinString: index === AREA_FIELDS.length - 1 ? '' : ', '
	}));
}

/**
 * One subtype page. E, F1 and F2 each get their own so the url can be a fixed
 * string
 */
function subtypeQuestion(useClassId: string, url: string, question: string, error: string) {
	return {
		type: COMPONENT_TYPES.RADIO,
		title: 'Subtype',
		question,
		fieldName: 'useClassSubtypeId',
		url,
		validators: [new RequiredValidator(error)],
		options: getSubtypeOptions(useClassId),
		viewData: { continueButtonText: 'Continue' }
	};
}

function wholeNumberValidator(fieldNames: readonly string[], regexMessage: string) {
	return new MultiFieldInputValidator({
		fields: fieldNames.map((fieldName) => ({
			fieldName,
			validators: [new NumericValidator({ regex: WHOLE_NUMBER, regexMessage })]
		}))
	});
}

/** Subtype options for one use class, empty when it has none. */
export function getSubtypeOptions(useClassId?: string) {
	if (!useClassId) {
		return [];
	}
	return USE_CLASS_SUBTYPES.filter((subtype) => subtype.useClassId === useClassId)
		.sort((a, b) => a.order - b.order)
		.map((subtype) => ({ text: subtype.displayName, value: subtype.id }));
}

export function hasSubtypePage(useClassId?: string): boolean {
	return !!useClassId && useClassId in SUBTYPE_PAGE_BY_USE_CLASS;
}

export function isRetail(useClassSubtypeId?: string): boolean {
	return useClassSubtypeId === USE_CLASS_SUBTYPE_ID.E_RETAIL;
}

export function hasRoomsBranch(useClassId?: string): boolean {
	return !!useClassId && USE_CLASSES_WITH_ROOMS.includes(useClassId);
}

const USE_CLASS_ORDER = new Map<string, number>(USE_CLASSES.map((useClass) => [useClass.id, useClass.order]));

/** An entry part-way through being added has no use class yet, and sorts to the end. */
function compareOrder(a?: number, b?: number): number {
	if (a === undefined && b === undefined) return 0;
	if (a === undefined) return 1;
	if (b === undefined) return -1;
	return a - b;
}

/**
 * Groups cards by use class, matching the DB ordering so an entry added this
 * session lands beside its siblings rather than at the end.
 */
export function compareFloorspaceItems(a: Record<string, unknown>, b: Record<string, unknown>): number {
	const orderOf = (id: unknown) => (typeof id === 'string' ? USE_CLASS_ORDER.get(id) : undefined);
	return compareOrder(orderOf(a.useClassId), orderOf(b.useClassId));
}

/** Card rows for one area set, labelled with the set name where it isn't the standard one. */
function areaRows(setId: string, prefix: string | undefined, showIf: (item: Record<string, unknown>) => boolean) {
	return AREA_FIELDS.map((field, index) => ({
		label: prefix ? `${prefix}: ${FLOORSPACE_LABELS[index]}` : FLOORSPACE_LABELS[index],
		fieldName: areaFieldName(setId, field),
		showIf
	}));
}

/**
 * The add-to-list for non-residential floorspace. The branch a given entry
 * takes is resolved from the item being edited rather than from the response,
 * matching how the residential unit-type options are narrowed.
 */
export function floorspaceQuestions(isQuestionView: boolean | undefined) {
	const entryIsRetail = (item: Record<string, unknown>) =>
		isRetail(typeof item.useClassSubtypeId === 'string' ? item.useClassSubtypeId : undefined);

	const entryHasRooms = (item: Record<string, unknown>) =>
		hasRoomsBranch(typeof item.useClassId === 'string' ? item.useClassId : undefined);

	return {
		manageFloorspace: {
			type: CUSTOM_COMPONENTS.CARD_MANAGE_LIST,
			title: isQuestionView ? 'Check non-residential floorspace details' : 'Type of use',
			question: 'Check non-residential floorspace details',
			fieldName: 'manageNonResidentialFloorspace',
			url: 'floorspace',
			titleSingular: 'type of use',
			cardTitle: (item: Record<string, unknown>, { getFormatted }: CardFormatContext) =>
				item.useClassId === USE_CLASS_ID.OTHER && typeof item.otherTypeOfUse === 'string' && item.otherTypeOfUse
					? item.otherTypeOfUse
					: getFormatted('useClassId'),
			sortItems: compareFloorspaceItems,
			viewData: {
				emptyListText:
					'Add one or more types of use for the non residential floorspace. No type of use details have been added.'
			},
			boldRowLabels: false,
			rows: [
				{
					label: 'Subtype',
					fieldName: 'useClassSubtypeId',
					showIf: (item: Record<string, unknown>) => Boolean(item.useClassSubtypeId)
				},
				...areaRows(FLOORSPACE_SET_ID.STANDARD, undefined, (item) => !entryIsRetail(item)),
				...areaRows(FLOORSPACE_SET_ID.SHOP, 'Shop', entryIsRetail),
				...areaRows(FLOORSPACE_SET_ID.NET_TRADEABLE, 'Net tradeable area', entryIsRetail),
				...ROOMS_FIELDS.map((fieldName, index) => ({
					label: ROOMS_LABELS[index],
					fieldName,
					showIf: entryHasRooms
				}))
			]
		},

		useClass: {
			type: COMPONENT_TYPES.RADIO,
			title: 'Use class',
			question: 'What is the use class or type of use for this non-residential floorspace?',
			fieldName: 'useClassId',
			url: 'use-class',
			validators: [
				new RequiredValidator('Select the use class or type of use'),
				new ConditionalRequiredValidator('Enter the type of use'),
				new ConditionalLengthValidator({
					min: 1,
					max: 250,
					errorMessage: 'The type of use must be 250 characters or less'
				})
			],
			options: USE_CLASSES.map((useClass) => ({
				text: useClass.displayName,
				value: useClass.id,
				...(useClass.id === USE_CLASS_ID.OTHER && {
					conditional: {
						type: 'text',
						fieldName: 'otherTypeOfUse',
						label: 'Type of use'
					}
				})
			})),
			viewData: { continueButtonText: 'Continue' }
		},
		subtypeCommercial: subtypeQuestion(
			USE_CLASS_ID.E,
			'subtype-commercial',
			"Which is the 'Commercial business and service' subtype?",
			'Select the commercial, business and service subtype'
		),
		subtypeLearning: subtypeQuestion(
			USE_CLASS_ID.F1,
			'subtype-learning',
			"Which is the 'Learning' subtype?",
			'Select the learning subtype'
		),
		subtypeCommunity: subtypeQuestion(
			USE_CLASS_ID.F2,
			'subtype-community',
			"Which is the 'Local community' subtype?",
			'Select the local community subtype'
		),
		floorspaceDetails: {
			type: COMPONENT_TYPES.MULTI_FIELD_INPUT,
			title: 'Floorspace details',
			question: 'What are the floorspace details?',
			fieldName: 'floorspaceDetails',
			url: 'floorspace-details',
			inputFields: areaInputFields(FLOORSPACE_SET_ID.STANDARD),
			validators: [wholeNumberValidator(areaFieldNames(FLOORSPACE_SET_ID.STANDARD), FLOORSPACE_ERROR)],
			viewData: { continueButtonText: 'Continue' }
		},

		shopFloorspace: {
			type: COMPONENT_TYPES.MULTI_FIELD_INPUT,
			title: 'Shop floorspace details',
			question: 'What are the shop floorspace details?',
			fieldName: 'shopFloorspace',
			url: 'shop-floorspace',
			inputFields: areaInputFields(FLOORSPACE_SET_ID.SHOP),
			validators: [wholeNumberValidator(areaFieldNames(FLOORSPACE_SET_ID.SHOP), FLOORSPACE_ERROR)],
			viewData: { continueButtonText: 'Continue' }
		},

		netTradeableArea: {
			type: COMPONENT_TYPES.MULTI_FIELD_INPUT,
			title: 'Net tradeable area floorspace details',
			question: 'What are the net tradeable area floorspace details?',
			fieldName: 'netTradeableArea',
			url: 'net-tradeable-area',
			inputFields: areaInputFields(FLOORSPACE_SET_ID.NET_TRADEABLE),
			validators: [wholeNumberValidator(areaFieldNames(FLOORSPACE_SET_ID.NET_TRADEABLE), FLOORSPACE_ERROR)],
			viewData: { continueButtonText: 'Continue' }
		},

		roomsChange: {
			type: COMPONENT_TYPES.BOOLEAN,
			title: 'Rooms change',
			question: 'Has there been a loss or gain in the number of rooms?',
			fieldName: 'hasRoomsChange',
			url: 'rooms-change',
			validators: [new RequiredValidator('Select yes if there has been a loss or gain in the number of rooms')],
			viewData: { continueButtonText: 'Continue' }
		},

		rooms: {
			type: COMPONENT_TYPES.MULTI_FIELD_INPUT,
			title: 'Rooms',
			question: 'How many rooms have been lost or gained?',
			fieldName: 'rooms',
			url: 'rooms',
			inputFields: ROOMS_FIELDS.map((fieldName, index) => ({
				fieldName,
				label: ROOMS_LABELS[index],
				classes: 'govuk-input--width-5',
				inputmode: 'numeric',
				pattern: '[0-9]*',
				suffix: { text: 'rooms' },
				formatPrefix: `${ROOMS_LABELS[index]}: `,
				formatJoinString: index === ROOMS_FIELDS.length - 1 ? '' : ', '
			})),
			validators: [wholeNumberValidator(ROOMS_FIELDS, ROOMS_ERROR)],
			viewData: { continueButtonText: 'Continue' }
		}
	};
}
