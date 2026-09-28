import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
	diffById,
	getItemId,
	isListInSave,
	resolveListAudits,
	resolveListItemRemoval,
	toListItems,
	type ListAuditConfig,
	type ListResolverRegistry
} from './list-changes.ts';
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
		const { matched } = diffById(
			[{ dbId: 'a' }],
			[{ formId: 'a' }],
			(item) => item.dbId,
			(item) => item.formId
		);

		assert.strictEqual(matched.length, 1);
	});
});

describe('resolveListAudits', () => {
	const config: ListAuditConfig = {
		actions: {
			added: AUDIT_ACTIONS.FIELD_SET,
			updated: AUDIT_ACTIONS.FIELD_UPDATED,
			deleted: AUDIT_ACTIONS.FIELD_CLEARED
		},
		getName: (item) => String(item.name),
		fields: [
			{ label: 'name', format: (item) => String(item.name) },
			{ label: 'notes', format: (item) => String(item.notes ?? '-'), action: AUDIT_ACTIONS.LONG_FIELD_UPDATED }
		]
	};

	it('should record additions, removals and updates, in that order', () => {
		const entries = resolveListAudits(
			'case-1',
			'user-1',
			[
				{ id: 'a', name: 'Kept' },
				{ id: 'b', name: 'Removed' }
			],
			[
				{ id: 'a', name: 'Kept (edited)' },
				{ id: 'c', name: 'Added' }
			],
			config
		);

		assert.deepStrictEqual(entries, [
			{ caseId: 'case-1', userId: 'user-1', action: AUDIT_ACTIONS.FIELD_SET, metadata: { name: 'Added' } },
			{ caseId: 'case-1', userId: 'user-1', action: AUDIT_ACTIONS.FIELD_CLEARED, metadata: { name: 'Removed' } },
			{
				caseId: 'case-1',
				userId: 'user-1',
				action: AUDIT_ACTIONS.FIELD_UPDATED,
				metadata: { entityName: 'Kept', fieldName: 'name', oldValue: 'Kept', newValue: 'Kept (edited)' }
			}
		]);
	});

	it('should record nothing for unchanged items', () => {
		const items = [{ id: 'a', name: 'Same' }];

		assert.deepStrictEqual(resolveListAudits('case-1', 'user-1', items, items, config), []);
	});

	it('should use a field-specific action when one is given', () => {
		const entries = resolveListAudits(
			'case-1',
			'user-1',
			[{ id: 'a', name: 'Item' }],
			[{ id: 'a', name: 'Item', notes: 'Line 1\nLine 2' }],
			config
		);

		assert.strictEqual(entries[0].action, AUDIT_ACTIONS.LONG_FIELD_UPDATED);
	});

	it('should add onRemoved entries straight after the removal', () => {
		const entries = resolveListAudits(
			'case-1',
			'user-1',
			[
				{ id: 'a', name: 'First' },
				{ id: 'b', name: 'Second' }
			],
			[],
			{
				...config,
				onRemoved: (item) => [
					{ caseId: 'case-1', userId: 'user-1', action: AUDIT_ACTIONS.CASE_NOTE_ADDED, metadata: { from: item.name } }
				]
			}
		);

		assert.deepStrictEqual(
			entries.map((entry) => entry.metadata),
			[{ name: 'First' }, { from: 'First' }, { name: 'Second' }, { from: 'Second' }]
		);
	});
});

describe('getItemId', () => {
	it('should return the ID when it is a string', () => {
		assert.strictEqual(getItemId({ id: 'a' }), 'a');
	});

	it('should return undefined otherwise', () => {
		assert.strictEqual(getItemId({}), undefined);
		assert.strictEqual(getItemId({ id: 1 }), undefined);
	});
});

describe('toListItems', () => {
	it('should keep objects and drop anything else', () => {
		assert.deepStrictEqual(toListItems([{ id: 'a' }, null, 'x', { id: 'b' }]), [{ id: 'a' }, { id: 'b' }]);
	});

	it('should return an empty list for non-arrays', () => {
		assert.deepStrictEqual(toListItems(null), []);
		assert.deepStrictEqual(toListItems(undefined), []);
	});
});

describe('resolveListItemRemoval', () => {
	const registry: ListResolverRegistry = {
		things: {
			subQuestions: [],
			resolve: ({ caseId, userId, oldItems, newItems }) =>
				resolveListAudits(caseId, userId, oldItems, newItems, {
					actions: {
						added: AUDIT_ACTIONS.FIELD_SET,
						updated: AUDIT_ACTIONS.FIELD_UPDATED,
						deleted: AUDIT_ACTIONS.FIELD_CLEARED
					},
					getName: (item) => String(item.name),
					fields: []
				})
		}
	};

	const previousCase = {
		things: [
			{ id: 'a', name: 'First' },
			{ id: 'b', name: 'Second' }
		]
	};

	it('should return an entry for the removed item only', () => {
		const entries = resolveListItemRemoval(registry, {
			caseId: 'case-1',
			userId: 'user-1',
			fieldName: 'things',
			itemId: 'b',
			previousCase
		});

		assert.deepStrictEqual(entries, [
			{ caseId: 'case-1', userId: 'user-1', action: AUDIT_ACTIONS.FIELD_CLEARED, metadata: { name: 'Second' } }
		]);
	});

	it('should return nothing if the item is not in the list', () => {
		assert.deepStrictEqual(
			resolveListItemRemoval(registry, {
				caseId: 'case-1',
				userId: 'user-1',
				fieldName: 'things',
				itemId: 'x',
				previousCase
			}),
			[]
		);
	});

	it('should return nothing for a list that is not in the registry', () => {
		assert.deepStrictEqual(
			resolveListItemRemoval(registry, {
				caseId: 'case-1',
				userId: 'user-1',
				fieldName: 'other',
				itemId: 'a',
				previousCase
			}),
			[]
		);
	});
});

describe('isListInSave', () => {
	it('should be true when the list is in the answers, even if emptied', () => {
		assert.ok(isListInSave({ things: [] }, 'things'));
		assert.ok(isListInSave({ things: null }, 'things'));
	});

	it('should be false when the list is not in the answers', () => {
		assert.ok(!isListInSave({ other: [] }, 'things'));
	});
});
