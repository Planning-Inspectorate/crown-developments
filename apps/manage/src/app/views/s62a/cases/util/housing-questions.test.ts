import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
	OCCUPANCY_TYPE_ID,
	UNIT_TYPE_ID,
	UNIT_TYPES_BY_OCCUPANCY,
	UNIT_TYPES
} from '@pins/crowndev-database/src/seed/s62a/data-static.ts';
import {
	compareHousingItems,
	getUnitTypeOptions,
	housingQuestions,
	sumBedroomBands,
	type HousingSide
} from './housing-questions.ts';
import type { ResidentialHousingItem } from '../view/view-model.ts';

const item = (overrides: Partial<ResidentialHousingItem> = {}) =>
	({ id: 'row-1', ...overrides }) as ResidentialHousingItem;

describe('sumBedroomBands', () => {
	it('sums every band', () => {
		const total = sumBedroomBands({
			bedroomsUnknown: '1',
			bedroomsOne: '2',
			bedroomsTwo: '3',
			bedroomsThree: '4',
			bedroomsFourPlus: '5'
		});

		assert.strictEqual(total, 15);
	});

	it('treats blank and missing bands as zero', () => {
		assert.strictEqual(sumBedroomBands({ bedroomsUnknown: '', bedroomsOne: '4' }), 4);
	});

	it('ignores values that are not numbers', () => {
		assert.strictEqual(sumBedroomBands({ bedroomsUnknown: 'abc', bedroomsOne: '4' }), 4);
	});

	it('returns zero for an entry with no bands answered', () => {
		assert.strictEqual(sumBedroomBands({}), 0);
	});
});

describe('getUnitTypeOptions', () => {
	it('returns every unit type when no item is being edited', () => {
		const options = getUnitTypeOptions([]);

		assert.strictEqual(options.length, UNIT_TYPES.length);
	});

	it('returns the reduced set for an occupancy that has one', () => {
		const items = [item({ id: 'row-1', occupancyTypeId: OCCUPANCY_TYPE_ID.STARTER_HOMES })];

		const values = getUnitTypeOptions(items, 'row-1').map((option) => option.value);

		assert.deepStrictEqual(values, UNIT_TYPES_BY_OCCUPANCY[OCCUPANCY_TYPE_ID.STARTER_HOMES]);
	});

	it('returns every unit type for an occupancy with no reduced set', () => {
		const items = [item({ id: 'row-1', occupancyTypeId: OCCUPANCY_TYPE_ID.MARKET_HOUSING })];

		assert.strictEqual(getUnitTypeOptions(items, 'row-1').length, UNIT_TYPES.length);
	});

	it('returns every unit type when the item is not in the list', () => {
		const items = [item({ id: 'row-1', occupancyTypeId: OCCUPANCY_TYPE_ID.STARTER_HOMES })];

		assert.strictEqual(getUnitTypeOptions(items, 'row-2').length, UNIT_TYPES.length);
	});

	it('returns every unit type when the item has no occupancy yet', () => {
		assert.strictEqual(getUnitTypeOptions([item({ id: 'row-1' })], 'row-1').length, UNIT_TYPES.length);
	});
});

describe('compareHousingItems', () => {
	const marketHouses = { occupancyTypeId: OCCUPANCY_TYPE_ID.MARKET_HOUSING, unitTypeId: UNIT_TYPE_ID.HOUSES };
	const marketFlats = {
		occupancyTypeId: OCCUPANCY_TYPE_ID.MARKET_HOUSING,
		unitTypeId: UNIT_TYPE_ID.FLATS_MAISONETTES
	};
	const starterHouses = { occupancyTypeId: OCCUPANCY_TYPE_ID.STARTER_HOMES, unitTypeId: UNIT_TYPE_ID.HOUSES };

	it('orders by occupancy first', () => {
		assert.ok(compareHousingItems(marketHouses, starterHouses) < 0);
		assert.ok(compareHousingItems(starterHouses, marketHouses) > 0);
	});

	it('orders by unit type within the same occupancy', () => {
		assert.ok(compareHousingItems(marketHouses, marketFlats) < 0);
	});

	it('sorts an entry with no occupancy to the end', () => {
		assert.ok(compareHousingItems({}, marketHouses) > 0);
		assert.ok(compareHousingItems(marketHouses, {}) < 0);
	});

	it('leaves two part-built entries in their existing order', () => {
		assert.strictEqual(compareHousingItems({}, {}), 0);
	});

	it('groups a list so that same-occupancy entries are consecutive', () => {
		const sorted = [starterHouses, marketHouses, marketFlats].sort(compareHousingItems);

		assert.deepStrictEqual(
			sorted.map((entry) => entry.occupancyTypeId),
			[OCCUPANCY_TYPE_ID.MARKET_HOUSING, OCCUPANCY_TYPE_ID.MARKET_HOUSING, OCCUPANCY_TYPE_ID.STARTER_HOMES]
		);
	});
});

describe('housingQuestions', () => {
	const build = (side: HousingSide, items: ResidentialHousingItem[] = [], manageListItemId?: string) =>
		housingQuestions({ side, items, manageListItemId, isQuestionView: false });

	it('returns the four questions that make up an add-to-list', () => {
		assert.deepStrictEqual(Object.keys(build('existing')), ['manageHousing', 'occupancyType', 'unitType', 'bedrooms']);
	});

	it('names the manage list field by side, since the caller keys on it', () => {
		assert.strictEqual(build('existing').manageHousing.fieldName, 'manageExistingHousing');
		assert.strictEqual(build('proposed').manageHousing.fieldName, 'manageProposedHousing');
	});

	it('names the bedrooms field by side, as both sides can be answered on one case', () => {
		assert.strictEqual(build('existing').bedrooms.fieldName, 'existingBedrooms');
		assert.strictEqual(build('proposed').bedrooms.fieldName, 'proposedBedrooms');
	});

	it('uses the same lookup field names on both sides, since one table holds both', () => {
		assert.strictEqual(build('existing').occupancyType.fieldName, 'occupancyTypeId');
		assert.strictEqual(build('proposed').occupancyType.fieldName, 'occupancyTypeId');
		assert.strictEqual(build('existing').unitType.fieldName, 'unitTypeId');
		assert.strictEqual(build('proposed').unitType.fieldName, 'unitTypeId');
	});

	it('uses the same urls on both sides, disambiguated by the section segment', () => {
		assert.strictEqual(build('existing').manageHousing.url, 'housing');
		assert.strictEqual(build('proposed').manageHousing.url, 'housing');
		assert.strictEqual(build('existing').unitType.url, 'unit-type');
		assert.strictEqual(build('proposed').unitType.url, 'unit-type');
	});

	it('words the questions for the side', () => {
		const existing = build('existing');

		assert.strictEqual(existing.occupancyType.question, 'Which is the type of occupancy for existing housing?');
		assert.strictEqual(existing.unitType.question, 'Which is the type of unit for existing housing?');
		assert.strictEqual(
			existing.bedrooms.question,
			'How many units per number of bedrooms are there for existing housing?'
		);
	});

	it('narrows the unit type options to the item being edited', () => {
		const items = [item({ id: 'row-1', occupancyTypeId: OCCUPANCY_TYPE_ID.SELF_BUILD_AND_CUSTOM_BUILD })];

		const values = build('proposed', items, 'row-1').unitType.options.map((option) => option.value);

		assert.deepStrictEqual(values, UNIT_TYPES_BY_OCCUPANCY[OCCUPANCY_TYPE_ID.SELF_BUILD_AND_CUSTOM_BUILD]);
	});

	it('builds the six card rows, with the derived total first', () => {
		const rows = build('proposed').manageHousing.rows;

		assert.deepStrictEqual(
			rows.map((row) => row.label),
			['Total number of units', 'Unknown no. of bedrooms', '1 bedroom', '2 bedrooms', '3 bedrooms', '4+ bedrooms']
		);
	});

	it('derives the total row from the bedroom bands', () => {
		const [totalRow] = build('proposed').manageHousing.rows;

		assert.strictEqual(totalRow.format?.({ bedroomsOne: '4', bedroomsTwo: '6' }), '10');
	});

	it('titles the check page differently from the tab row', () => {
		const onTab = housingQuestions({ side: 'existing', items: [], isQuestionView: false });
		const onQuestion = housingQuestions({ side: 'existing', items: [], isQuestionView: true });

		assert.strictEqual(onTab.manageHousing.title, 'Existing housing');
		assert.strictEqual(onQuestion.manageHousing.title, 'Check existing housing details');
	});
});
