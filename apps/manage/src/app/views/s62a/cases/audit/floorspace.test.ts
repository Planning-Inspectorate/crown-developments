import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
	FLOORSPACE_SET_ID,
	USE_CLASSES,
	USE_CLASS_ID,
	USE_CLASS_SUBTYPES
} from '@pins/crowndev-database/src/seed/s62a/data-static.ts';
import { AREA_FIELDS, FLOORSPACE_LABELS, ROOMS_FIELDS, ROOMS_LABELS, areaFieldName } from '../view/view-model.ts';
import { getFloorspaceSet, getRooms, getSubtype, getTypeOfUse, resolveFloorspaceAudits } from './floorspace.ts';
import { S62A_AUDIT_ACTIONS } from './actions.ts';
import { S62A_LIST_RESOLVERS } from './list-resolvers.ts';

const CASE_ID = 'case-1';
const USER_ID = 'user-1';

// Uses entries from the seed data, so the tests don't depend on specific IDs
const [USE_ONE, USE_TWO] = USE_CLASSES.filter((useClass) => useClass.id !== USE_CLASS_ID.OTHER);
const [SUBTYPE_ONE] = USE_CLASS_SUBTYPES;

const STANDARD_FIRST = areaFieldName(FLOORSPACE_SET_ID.STANDARD, AREA_FIELDS[0]);
const STANDARD_SECOND = areaFieldName(FLOORSPACE_SET_ID.STANDARD, AREA_FIELDS[1]);
const SHOP_FIRST = areaFieldName(FLOORSPACE_SET_ID.SHOP, AREA_FIELDS[0]);

function floorspace(overrides: Record<string, unknown> = {}) {
	return {
		id: 'floorspace-1',
		useClassId: USE_ONE.id,
		[STANDARD_FIRST]: '1',
		...overrides
	};
}

describe('getTypeOfUse', () => {
	it('should resolve the use class to its display name', () => {
		assert.strictEqual(getTypeOfUse(floorspace()), USE_ONE.displayName);
	});

	it('should use the typed text for Other, as the card title does', () => {
		assert.strictEqual(
			getTypeOfUse({ useClassId: USE_CLASS_ID.OTHER, otherTypeOfUse: 'Test type of use' }),
			'Test type of use'
		);
	});

	it('should return "-" if no use class is set', () => {
		assert.strictEqual(getTypeOfUse({}), '-');
	});
});

describe('getSubtype', () => {
	it('should resolve the subtype to its display name', () => {
		assert.strictEqual(getSubtype({ useClassSubtypeId: SUBTYPE_ONE.id }), SUBTYPE_ONE.displayName);
	});

	it('should return "-" if there is no subtype', () => {
		assert.strictEqual(getSubtype({}), '-');
	});
});

describe('getFloorspaceSet', () => {
	it('should list the figures that have a value, one per line, in m²', () => {
		assert.strictEqual(
			getFloorspaceSet(floorspace({ [STANDARD_SECOND]: 6 }), FLOORSPACE_SET_ID.STANDARD),
			`- ${FLOORSPACE_LABELS[0]}: 1m²\n- ${FLOORSPACE_LABELS[1]}: 6m²`
		);
	});

	it('should only read the requested set', () => {
		assert.strictEqual(getFloorspaceSet(floorspace(), FLOORSPACE_SET_ID.SHOP), '-');
	});
});

describe('getRooms', () => {
	it('should list the room figures that have a value, one per line', () => {
		assert.strictEqual(getRooms({ [ROOMS_FIELDS[0]]: '10' }), `- ${ROOMS_LABELS[0]}: 10`);
	});

	it('should return "-" if there are no room figures', () => {
		assert.strictEqual(getRooms({}), '-');
	});
});

describe('resolveFloorspaceAudits', () => {
	it('should record an entry being added', () => {
		const entries = resolveFloorspaceAudits(CASE_ID, USER_ID, [], [floorspace()]);

		assert.deepStrictEqual(entries, [
			{
				caseId: CASE_ID,
				userId: USER_ID,
				action: S62A_AUDIT_ACTIONS.NON_RESIDENTIAL_FLOORSPACE_ADDED,
				metadata: { name: USE_ONE.displayName }
			}
		]);
	});

	it('should record an entry being deleted', () => {
		const entries = resolveFloorspaceAudits(CASE_ID, USER_ID, [floorspace()], []);

		assert.strictEqual(entries[0].action, S62A_AUDIT_ACTIONS.NON_RESIDENTIAL_FLOORSPACE_DELETED);
	});

	it('should record nothing when an entry is unchanged', () => {
		assert.deepStrictEqual(resolveFloorspaceAudits(CASE_ID, USER_ID, [floorspace()], [floorspace()]), []);
	});

	it('should use the single-value action for type of use', () => {
		const entries = resolveFloorspaceAudits(CASE_ID, USER_ID, [floorspace()], [floorspace({ useClassId: USE_TWO.id })]);

		assert.deepStrictEqual(entries, [
			{
				caseId: CASE_ID,
				userId: USER_ID,
				action: S62A_AUDIT_ACTIONS.NON_RESIDENTIAL_FLOORSPACE_UPDATED,
				metadata: {
					entityName: USE_ONE.displayName,
					fieldName: 'type of use',
					oldValue: USE_ONE.displayName,
					newValue: USE_TWO.displayName
				}
			}
		]);
	});

	it('should use the list action for floorspace details', () => {
		const entries = resolveFloorspaceAudits(CASE_ID, USER_ID, [floorspace()], [floorspace({ [STANDARD_FIRST]: '10' })]);

		assert.deepStrictEqual(entries, [
			{
				caseId: CASE_ID,
				userId: USER_ID,
				action: S62A_AUDIT_ACTIONS.NON_RESIDENTIAL_FLOORSPACE_LIST_UPDATED,
				metadata: {
					entityName: USE_ONE.displayName,
					fieldName: 'floorspace details',
					oldValue: `- ${FLOORSPACE_LABELS[0]}: 1m²`,
					newValue: `- ${FLOORSPACE_LABELS[0]}: 10m²`
				}
			}
		]);
	});

	it('should record shop floorspace and rooms separately', () => {
		const entries = resolveFloorspaceAudits(
			CASE_ID,
			USER_ID,
			[floorspace({ [ROOMS_FIELDS[0]]: '10' })],
			[floorspace({ [SHOP_FIRST]: '5' })]
		);

		assert.deepStrictEqual(
			entries.map((entry) => entry.metadata),
			[
				{
					entityName: USE_ONE.displayName,
					fieldName: 'shop floorspace details',
					oldValue: '-',
					newValue: `- ${FLOORSPACE_LABELS[0]}: 5m²`
				},
				{
					entityName: USE_ONE.displayName,
					fieldName: 'loss or change in number of rooms',
					oldValue: `- ${ROOMS_LABELS[0]}: 10`,
					newValue: '-'
				}
			]
		);
	});
});

describe('S62A_LIST_RESOLVERS non-residential floorspace', () => {
	it('should be registered against the floorspace list', () => {
		const entries = S62A_LIST_RESOLVERS.manageNonResidentialFloorspace.resolve({
			caseId: CASE_ID,
			userId: USER_ID,
			oldItems: [],
			newItems: [floorspace()],
			previousCase: {},
			answers: {}
		});

		assert.strictEqual(entries[0].action, S62A_AUDIT_ACTIONS.NON_RESIDENTIAL_FLOORSPACE_ADDED);
	});
});
