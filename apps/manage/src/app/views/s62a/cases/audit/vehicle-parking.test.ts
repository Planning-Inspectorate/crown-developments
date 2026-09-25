import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { VEHICLE_PARKING_CATEGORY_MAP } from '@pins/crowndev-database/src/seed/s62a/data-static.ts';
import { getVehicleType, resolveVehicleParkingAudits } from './vehicle-parking.ts';
import { S62A_AUDIT_ACTIONS } from './actions.ts';
import { S62A_LIST_RESOLVERS } from './list-resolvers.ts';

const CASE_ID = 'case-1';
const USER_ID = 'user-1';

// Uses the first two categories, so the tests don't depend on specific seed IDs
const [[FIRST_TYPE_ID, FIRST_TYPE_NAME], [SECOND_TYPE_ID, SECOND_TYPE_NAME]] = [
	...VEHICLE_PARKING_CATEGORY_MAP.entries()
];
const OTHER_TYPE_NAME = VEHICLE_PARKING_CATEGORY_MAP.get('other') ?? 'other';

function parking(overrides: Record<string, unknown> = {}) {
	return {
		id: 'parking-1',
		vehicleType: FIRST_TYPE_ID,
		existingSpaces: '100',
		proposedSpaces: '100',
		...overrides
	};
}

describe('getVehicleType', () => {
	it('should resolve the vehicle type to its display name', () => {
		assert.strictEqual(getVehicleType(parking()), FIRST_TYPE_NAME);
	});

	it('should include the text for Other', () => {
		assert.strictEqual(
			getVehicleType({ vehicleType: 'other', otherVehicleType: 'Minibuses' }),
			`${OTHER_TYPE_NAME}: Minibuses`
		);
	});

	it('should read the Other text from the nested key too', () => {
		assert.strictEqual(
			getVehicleType({ vehicleType: 'other', vehicleType_otherVehicleType: 'Minibuses' }),
			`${OTHER_TYPE_NAME}: Minibuses`
		);
	});

	it('should return "-" if no type is set', () => {
		assert.strictEqual(getVehicleType({}), '-');
	});
});

describe('resolveVehicleParkingAudits', () => {
	it('should record parking being added', () => {
		const entries = resolveVehicleParkingAudits(CASE_ID, USER_ID, [], [parking()]);

		assert.deepStrictEqual(entries, [
			{
				caseId: CASE_ID,
				userId: USER_ID,
				action: S62A_AUDIT_ACTIONS.VEHICLE_PARKING_ADDED,
				metadata: { name: FIRST_TYPE_NAME }
			}
		]);
	});

	it('should record parking being deleted', () => {
		const entries = resolveVehicleParkingAudits(CASE_ID, USER_ID, [parking()], []);

		assert.deepStrictEqual(entries, [
			{
				caseId: CASE_ID,
				userId: USER_ID,
				action: S62A_AUDIT_ACTIONS.VEHICLE_PARKING_DELETED,
				metadata: { name: FIRST_TYPE_NAME }
			}
		]);
	});

	it('should record nothing when parking is unchanged', () => {
		assert.deepStrictEqual(resolveVehicleParkingAudits(CASE_ID, USER_ID, [parking()], [parking()]), []);
	});

	it('should record a type change using the original type', () => {
		const entries = resolveVehicleParkingAudits(
			CASE_ID,
			USER_ID,
			[parking()],
			[parking({ vehicleType: SECOND_TYPE_ID })]
		);

		assert.deepStrictEqual(entries[0].metadata, {
			entityName: FIRST_TYPE_NAME,
			fieldName: 'Type of vehicle',
			oldValue: FIRST_TYPE_NAME,
			newValue: SECOND_TYPE_NAME
		});
	});

	it('should record existing and proposed spaces separately', () => {
		const entries = resolveVehicleParkingAudits(
			CASE_ID,
			USER_ID,
			[parking()],
			[parking({ existingSpaces: '10', proposedSpaces: '20' })]
		);

		assert.deepStrictEqual(
			entries.map((entry) => entry.metadata),
			[
				{ entityName: FIRST_TYPE_NAME, fieldName: 'Existing spaces', oldValue: '100', newValue: '10' },
				{ entityName: FIRST_TYPE_NAME, fieldName: 'Proposed spaces', oldValue: '100', newValue: '20' }
			]
		);
	});
});

describe('S62A_LIST_RESOLVERS vehicle parking', () => {
	it('should be registered against the vehicle parking list', () => {
		const entries = S62A_LIST_RESOLVERS.vehicleParking.resolve({
			caseId: CASE_ID,
			userId: USER_ID,
			oldItems: [],
			newItems: [parking()],
			previousCase: {},
			answers: {}
		});

		assert.strictEqual(entries[0].action, S62A_AUDIT_ACTIONS.VEHICLE_PARKING_ADDED);
	});
});
