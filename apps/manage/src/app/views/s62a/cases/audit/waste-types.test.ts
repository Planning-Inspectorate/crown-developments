import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
	WASTE_TYPES,
	WASTE_TYPES_WITHOUT_VOID_CAPACITY,
	WASTE_UNIT_ID
} from '@pins/crowndev-database/src/seed/s62a/data-static.ts';
import { formatWasteAmount, getWasteCapacity, getWasteTypeName, resolveWasteTypeAudits } from './waste-types.ts';
import { S62A_AUDIT_ACTIONS } from './actions.ts';
import { S62A_LIST_RESOLVERS } from './list-resolvers.ts';

const CASE_ID = 'case-1';
const USER_ID = 'user-1';

// Picks waste types from the seed data, so the tests don't depend on specific IDs
const [WITH_CAPACITY, OTHER_WITH_CAPACITY] = WASTE_TYPES.filter(
	(type) => !WASTE_TYPES_WITHOUT_VOID_CAPACITY.includes(type.id)
);
const WITHOUT_CAPACITY = WASTE_TYPES.find((type) => WASTE_TYPES_WITHOUT_VOID_CAPACITY.includes(type.id));

function wasteType(overrides: Record<string, unknown> = {}) {
	return {
		id: 'waste-1',
		wasteTypeId: WITH_CAPACITY.id,
		voidCapacityUnitId: WASTE_UNIT_ID.CUBIC_METRES,
		[`voidCapacityUnitId_${WASTE_UNIT_ID.CUBIC_METRES}`]: '1',
		maxAnnualThroughputUnitId: WASTE_UNIT_ID.TONNES,
		[`maxAnnualThroughputUnitId_${WASTE_UNIT_ID.TONNES}`]: '50',
		...overrides
	};
}

describe('getWasteTypeName', () => {
	it('should resolve the waste type to its display name', () => {
		assert.strictEqual(getWasteTypeName(wasteType()), WITH_CAPACITY.displayName);
	});

	it('should return "-" if no type is set', () => {
		assert.strictEqual(getWasteTypeName({}), '-');
	});
});

describe('formatWasteAmount', () => {
	it('should show the amount with its unit', () => {
		assert.strictEqual(formatWasteAmount(wasteType(), 'voidCapacityUnitId', 'voidCapacity'), '1m³');
		assert.strictEqual(formatWasteAmount(wasteType(), 'maxAnnualThroughputUnitId', 'maxAnnualThroughput'), '50t');
	});

	it('should fall back to the flat amount field', () => {
		const item = { voidCapacityUnitId: WASTE_UNIT_ID.LITRES, voidCapacity: 20 };

		assert.strictEqual(formatWasteAmount(item, 'voidCapacityUnitId', 'voidCapacity'), '20l');
	});

	it('should return "-" if there is no unit or no amount', () => {
		assert.strictEqual(formatWasteAmount({}, 'voidCapacityUnitId', 'voidCapacity'), '-');
		assert.strictEqual(
			formatWasteAmount({ voidCapacityUnitId: WASTE_UNIT_ID.TONNES }, 'voidCapacityUnitId', 'voidCapacity'),
			'-'
		);
	});
});

describe('getWasteCapacity', () => {
	it('should show "N/A" for waste types without void capacity', { skip: !WITHOUT_CAPACITY }, () => {
		assert.strictEqual(getWasteCapacity(wasteType({ wasteTypeId: WITHOUT_CAPACITY?.id })), 'N/A');
	});
});

describe('resolveWasteTypeAudits', () => {
	it('should record a waste type being added', () => {
		const entries = resolveWasteTypeAudits(CASE_ID, USER_ID, [], [wasteType()]);

		assert.deepStrictEqual(entries, [
			{
				caseId: CASE_ID,
				userId: USER_ID,
				action: S62A_AUDIT_ACTIONS.WASTE_TYPE_ADDED,
				metadata: { name: WITH_CAPACITY.displayName }
			}
		]);
	});

	it('should record a waste type being deleted', () => {
		const entries = resolveWasteTypeAudits(CASE_ID, USER_ID, [wasteType()], []);

		assert.deepStrictEqual(entries, [
			{
				caseId: CASE_ID,
				userId: USER_ID,
				action: S62A_AUDIT_ACTIONS.WASTE_TYPE_DELETED,
				metadata: { name: WITH_CAPACITY.displayName }
			}
		]);
	});

	it('should record nothing when a waste type is unchanged', () => {
		assert.deepStrictEqual(resolveWasteTypeAudits(CASE_ID, USER_ID, [wasteType()], [wasteType()]), []);
	});

	it('should record a type change using the original type', () => {
		const entries = resolveWasteTypeAudits(
			CASE_ID,
			USER_ID,
			[wasteType()],
			[wasteType({ wasteTypeId: OTHER_WITH_CAPACITY.id })]
		);

		assert.deepStrictEqual(entries[0].metadata, {
			entityName: WITH_CAPACITY.displayName,
			fieldName: 'type of waste',
			oldValue: WITH_CAPACITY.displayName,
			newValue: OTHER_WITH_CAPACITY.displayName
		});
	});

	it('should record capacity and throughput changes, including unit changes', () => {
		const entries = resolveWasteTypeAudits(
			CASE_ID,
			USER_ID,
			[wasteType()],
			[
				wasteType({
					voidCapacityUnitId: WASTE_UNIT_ID.TONNES,
					[`voidCapacityUnitId_${WASTE_UNIT_ID.TONNES}`]: '100',
					[`maxAnnualThroughputUnitId_${WASTE_UNIT_ID.TONNES}`]: '75'
				})
			]
		);

		assert.deepStrictEqual(
			entries.map((entry) => entry.metadata),
			[
				{ entityName: WITH_CAPACITY.displayName, fieldName: 'capacity', oldValue: '1m³', newValue: '100t' },
				{ entityName: WITH_CAPACITY.displayName, fieldName: 'throughput', oldValue: '50t', newValue: '75t' }
			]
		);
	});
});

describe('S62A_LIST_RESOLVERS types of waste', () => {
	it('should be registered against the types of waste list', () => {
		const entries = S62A_LIST_RESOLVERS.manageWasteTypes.resolve({
			caseId: CASE_ID,
			userId: USER_ID,
			oldItems: [wasteType()],
			newItems: [],
			previousCase: {},
			answers: {}
		});

		assert.strictEqual(entries[0].action, S62A_AUDIT_ACTIONS.WASTE_TYPE_DELETED);
	});
});
