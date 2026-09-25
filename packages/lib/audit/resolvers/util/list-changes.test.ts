import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { compactEntries, diffById, fieldChange } from './list-changes.ts';
import { AUDIT_ACTIONS } from '../../actions.ts';

type Item = { id?: string | null; name: string };

const byId = (item: Item) => item.id;

describe('diffById', () => {
	it('should find added, removed and matched items', () => {
		const oldItems: Item[] = [
			{ id: 'a', name: 'Kept' },
			{ id: 'b', name: 'Removed' }
		];
		const newItems: Item[] = [
			{ id: 'a', name: 'Kept (edited)' },
			{ id: 'c', name: 'Added' }
		];

		const { added, removed, matched } = diffById(oldItems, newItems, byId, byId);

		assert.deepStrictEqual(added, [{ id: 'c', name: 'Added' }]);
		assert.deepStrictEqual(removed, [{ id: 'b', name: 'Removed' }]);
		assert.deepStrictEqual(matched, [{ oldItem: oldItems[0], newItem: newItems[0] }]);
	});

	it('should treat new items without an ID as added', () => {
		const { added, matched } = diffById<Item, Item>([], [{ name: 'No ID' }, { id: null, name: 'Null ID' }], byId, byId);

		assert.strictEqual(added.length, 2);
		assert.strictEqual(matched.length, 0);
	});

	it('should ignore old items without an ID', () => {
		const { removed } = diffById<Item, Item>([{ name: 'No ID' }], [], byId, byId);

		assert.deepStrictEqual(removed, []);
	});

	it('should handle deletions from the middle of the list', () => {
		const oldItems: Item[] = [
			{ id: 'a', name: 'First' },
			{ id: 'b', name: 'Middle' },
			{ id: 'c', name: 'Last' }
		];
		const newItems: Item[] = [
			{ id: 'a', name: 'First' },
			{ id: 'c', name: 'Last' }
		];

		const { added, removed, matched } = diffById(oldItems, newItems, byId, byId);

		assert.deepStrictEqual(added, []);
		assert.deepStrictEqual(removed, [{ id: 'b', name: 'Middle' }]);
		assert.strictEqual(matched.length, 2);
	});

	it('should support different ID keys for old and new items', () => {
		const oldItems = [{ dbId: 'a' }];
		const newItems = [{ formId: 'a' }];

		const { matched } = diffById(
			oldItems,
			newItems,
			(item) => item.dbId,
			(item) => item.formId
		);

		assert.strictEqual(matched.length, 1);
	});
});

describe('fieldChange', () => {
	const base = { caseId: 'case-1', userId: 'user-1', action: AUDIT_ACTIONS.FIELD_UPDATED };

	it('should return null when the values are the same', () => {
		assert.strictEqual(fieldChange(base, { entityName: 'Test User One' }, 'email', 'a@test.com', 'a@test.com'), null);
	});

	it('should build an update entry when the values differ', () => {
		const entry = fieldChange(base, { entityName: 'Test User One' }, 'email', 'a@test.com', 'b@test.com');

		assert.deepStrictEqual(entry, {
			...base,
			metadata: { entityName: 'Test User One', fieldName: 'email', oldValue: 'a@test.com', newValue: 'b@test.com' }
		});
	});
});

describe('compactEntries', () => {
	it('should drop nulls', () => {
		const entry = { caseId: 'case-1', action: AUDIT_ACTIONS.CASE_CREATED, metadata: { name: 'Test User One' } };

		assert.deepStrictEqual(compactEntries([null, entry, null]), [entry]);
	});
});
