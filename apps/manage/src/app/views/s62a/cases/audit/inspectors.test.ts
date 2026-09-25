import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { getInspectorName, resolveInspectorAudits } from './inspectors.ts';
import { S62A_AUDIT_ACTIONS } from './actions.ts';
import { S62A_LIST_RESOLVERS } from './list-resolvers.ts';

const CASE_ID = 'case-1';
const USER_ID = 'user-1';

const userDisplayNameMap = new Map([
	['inspector-1', 'Test Inspector One'],
	['inspector-2', 'Test Inspector Two']
]);

function inspector(overrides: Record<string, unknown> = {}) {
	return {
		id: 'item-1',
		inspectorId: 'inspector-1',
		inspectorAssignedDate: new Date('2025-10-01T00:00:00Z'),
		inspectorAppointedDate: new Date('2025-10-10T00:00:00Z'),
		...overrides
	};
}

describe('getInspectorName', () => {
	it('should resolve the Entra ID to a display name', () => {
		assert.strictEqual(getInspectorName(inspector(), userDisplayNameMap), 'Test Inspector One');
	});

	it('should fall back to the raw ID if the user is not known', () => {
		assert.strictEqual(getInspectorName(inspector({ inspectorId: 'unknown-id' }), userDisplayNameMap), 'unknown-id');
	});

	it('should return "-" if no inspector is set', () => {
		assert.strictEqual(getInspectorName({}, userDisplayNameMap), '-');
	});
});

describe('resolveInspectorAudits', () => {
	it('should record an inspector being added', () => {
		const entries = resolveInspectorAudits(CASE_ID, USER_ID, [], [inspector()], userDisplayNameMap);

		assert.deepStrictEqual(entries, [
			{
				caseId: CASE_ID,
				userId: USER_ID,
				action: S62A_AUDIT_ACTIONS.INSPECTOR_ADDED,
				metadata: { name: 'Test Inspector One' }
			}
		]);
	});

	it('should record an inspector being deleted', () => {
		const entries = resolveInspectorAudits(CASE_ID, USER_ID, [inspector()], [], userDisplayNameMap);

		assert.deepStrictEqual(entries, [
			{
				caseId: CASE_ID,
				userId: USER_ID,
				action: S62A_AUDIT_ACTIONS.INSPECTOR_DELETED,
				metadata: { name: 'Test Inspector One' }
			}
		]);
	});

	it('should record nothing when an inspector is unchanged', () => {
		const entries = resolveInspectorAudits(CASE_ID, USER_ID, [inspector()], [inspector()], userDisplayNameMap);

		assert.deepStrictEqual(entries, []);
	});

	it('should record a change of inspector as an update, not a delete and add', () => {
		const entries = resolveInspectorAudits(
			CASE_ID,
			USER_ID,
			[inspector()],
			[inspector({ inspectorId: 'inspector-2' })],
			userDisplayNameMap
		);

		assert.deepStrictEqual(entries, [
			{
				caseId: CASE_ID,
				userId: USER_ID,
				action: S62A_AUDIT_ACTIONS.INSPECTOR_UPDATED,
				metadata: {
					entityName: 'Test Inspector One',
					fieldName: 'inspector name',
					oldValue: 'Test Inspector One',
					newValue: 'Test Inspector Two'
				}
			}
		]);
	});

	it('should record date assigned and date appointed changes separately', () => {
		const entries = resolveInspectorAudits(
			CASE_ID,
			USER_ID,
			[inspector()],
			[
				inspector({
					inspectorAssignedDate: new Date('2026-10-01T00:00:00Z'),
					inspectorAppointedDate: new Date('2026-10-10T00:00:00Z')
				})
			],
			userDisplayNameMap
		);

		assert.deepStrictEqual(
			entries.map((entry) => entry.metadata),
			[
				{
					entityName: 'Test Inspector One',
					fieldName: 'date assigned',
					oldValue: '1 October 2025',
					newValue: '1 October 2026'
				},
				{
					entityName: 'Test Inspector One',
					fieldName: 'date appointed',
					oldValue: '10 October 2025',
					newValue: '10 October 2026'
				}
			]
		);
	});

	it('should show "-" when a date is removed', () => {
		const entries = resolveInspectorAudits(
			CASE_ID,
			USER_ID,
			[inspector()],
			[inspector({ inspectorAppointedDate: null })],
			userDisplayNameMap
		);

		assert.deepStrictEqual(entries[0].metadata, {
			entityName: 'Test Inspector One',
			fieldName: 'date appointed',
			oldValue: '10 October 2025',
			newValue: '-'
		});
	});
});

describe('S62A_LIST_RESOLVERS inspectors', () => {
	it('should use the user display names from the context', () => {
		const entries = S62A_LIST_RESOLVERS.manageCaseTeamInspectors.resolve({
			caseId: CASE_ID,
			userId: USER_ID,
			oldItems: [],
			newItems: [inspector()],
			previousCase: {},
			answers: {},
			context: { userDisplayNameMap }
		});

		assert.deepStrictEqual(entries[0].metadata, { name: 'Test Inspector One' });
	});

	it('should fall back to raw IDs when there is no context', () => {
		const entries = S62A_LIST_RESOLVERS.manageCaseTeamInspectors.resolve({
			caseId: CASE_ID,
			userId: USER_ID,
			oldItems: [],
			newItems: [inspector()],
			previousCase: {},
			answers: {}
		});

		assert.deepStrictEqual(entries[0].metadata, { name: 'inspector-1' });
	});
});
