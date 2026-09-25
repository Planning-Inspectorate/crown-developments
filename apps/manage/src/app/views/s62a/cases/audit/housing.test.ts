import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { OCCUPANCY_TYPES, UNIT_TYPES } from '@pins/crowndev-database/src/seed/s62a/data-static.ts';
import { BEDROOM_BANDS } from '../view/view-model.ts';
import { getBedroomUnits, getHousingName, resolveHousingAudits } from './housing.ts';
import { S62A_AUDIT_ACTIONS } from './actions.ts';
import { S62A_LIST_RESOLVERS } from './list-resolvers.ts';

const CASE_ID = 'case-1';
const USER_ID = 'user-1';

// Uses entries from the seed data, so the tests don't depend on specific IDs
const [OCCUPANCY_ONE, OCCUPANCY_TWO] = OCCUPANCY_TYPES;
const [UNIT_ONE, UNIT_TWO] = UNIT_TYPES;
const [BAND_ONE, BAND_TWO] = BEDROOM_BANDS;

const NAME = `${OCCUPANCY_ONE.displayName} - ${UNIT_ONE.displayName}`;

function housing(overrides: Record<string, unknown> = {}) {
	return {
		id: 'housing-1',
		occupancyTypeId: OCCUPANCY_ONE.id,
		unitTypeId: UNIT_ONE.id,
		[BAND_ONE.fieldName]: '10',
		...overrides
	};
}

describe('getHousingName', () => {
	it('should match the card title', () => {
		assert.strictEqual(getHousingName(housing()), NAME);
	});

	it('should use the occupancy type alone if there is no unit type', () => {
		assert.strictEqual(getHousingName(housing({ unitTypeId: undefined })), OCCUPANCY_ONE.displayName);
	});

	it('should return "-" if neither is set', () => {
		assert.strictEqual(getHousingName({}), '-');
	});
});

describe('getBedroomUnits', () => {
	it('should list the bands that have a value, using the form labels', () => {
		assert.strictEqual(
			getBedroomUnits(housing({ [BAND_TWO.fieldName]: 6 })),
			`${BAND_ONE.label}: 10, ${BAND_TWO.label}: 6`
		);
	});

	it('should include bands set to 0', () => {
		assert.strictEqual(getBedroomUnits({ [BAND_ONE.fieldName]: '0' }), `${BAND_ONE.label}: 0`);
	});

	it('should return "-" if no bands are set', () => {
		assert.strictEqual(getBedroomUnits({}), '-');
	});
});

describe('resolveHousingAudits', () => {
	it('should record an entry being added to existing housing', () => {
		const entries = resolveHousingAudits(CASE_ID, USER_ID, [], [housing()], 'existing');

		assert.deepStrictEqual(entries, [
			{
				caseId: CASE_ID,
				userId: USER_ID,
				action: S62A_AUDIT_ACTIONS.EXISTING_HOUSING_ADDED,
				metadata: { name: NAME }
			}
		]);
	});

	it('should record an entry being deleted from proposed housing', () => {
		const entries = resolveHousingAudits(CASE_ID, USER_ID, [housing()], [], 'proposed');

		assert.deepStrictEqual(entries, [
			{
				caseId: CASE_ID,
				userId: USER_ID,
				action: S62A_AUDIT_ACTIONS.PROPOSED_HOUSING_DELETED,
				metadata: { name: NAME }
			}
		]);
	});

	it('should record nothing when an entry is unchanged', () => {
		assert.deepStrictEqual(resolveHousingAudits(CASE_ID, USER_ID, [housing()], [housing()], 'existing'), []);
	});

	it('should record occupancy and unit type changes using the original name', () => {
		const entries = resolveHousingAudits(
			CASE_ID,
			USER_ID,
			[housing()],
			[housing({ occupancyTypeId: OCCUPANCY_TWO.id, unitTypeId: UNIT_TWO.id })],
			'existing'
		);

		assert.deepStrictEqual(
			entries.map((entry) => ({ action: entry.action, metadata: entry.metadata })),
			[
				{
					action: S62A_AUDIT_ACTIONS.EXISTING_HOUSING_UPDATED,
					metadata: {
						entityName: NAME,
						fieldName: 'type of occupancy',
						oldValue: OCCUPANCY_ONE.displayName,
						newValue: OCCUPANCY_TWO.displayName
					}
				},
				{
					action: S62A_AUDIT_ACTIONS.EXISTING_HOUSING_UPDATED,
					metadata: {
						entityName: NAME,
						fieldName: 'type of unit',
						oldValue: UNIT_ONE.displayName,
						newValue: UNIT_TWO.displayName
					}
				}
			]
		);
	});

	it('should record bedroom changes as one entry', () => {
		const entries = resolveHousingAudits(
			CASE_ID,
			USER_ID,
			[housing()],
			[housing({ [BAND_ONE.fieldName]: '', [BAND_TWO.fieldName]: '4' })],
			'proposed'
		);

		assert.deepStrictEqual(entries, [
			{
				caseId: CASE_ID,
				userId: USER_ID,
				action: S62A_AUDIT_ACTIONS.PROPOSED_HOUSING_UPDATED,
				metadata: {
					entityName: NAME,
					fieldName: 'number of bedroom units',
					oldValue: `${BAND_ONE.label}: 10`,
					newValue: `${BAND_TWO.label}: 4`
				}
			}
		]);
	});
});

describe('S62A_LIST_RESOLVERS housing', () => {
	const args = { caseId: CASE_ID, userId: USER_ID, oldItems: [], newItems: [housing()], previousCase: {}, answers: {} };

	it('should use the existing housing actions for existing housing', () => {
		const entries = S62A_LIST_RESOLVERS.manageExistingHousing.resolve(args);

		assert.strictEqual(entries[0].action, S62A_AUDIT_ACTIONS.EXISTING_HOUSING_ADDED);
	});

	it('should use the proposed housing actions for proposed housing', () => {
		const entries = S62A_LIST_RESOLVERS.manageProposedHousing.resolve(args);

		assert.strictEqual(entries[0].action, S62A_AUDIT_ACTIONS.PROPOSED_HOUSING_ADDED);
	});
});
