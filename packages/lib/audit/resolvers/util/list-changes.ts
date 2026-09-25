import type { AuditEntry } from '../../types.ts';

/**
 * Shared helpers for list resolvers.
 *
 * Every list resolver (contacts, organisations, inspectors, etc.) does the
 * same two things: work out which items were added, removed or kept, then
 * compare each kept item field by field. These helpers do both, so each
 * resolver only has to say which fields to compare and how to format them.
 */

export type ItemId = string | null | undefined;

export interface ListDiff<TOld, TNew> {
	/** Items in the new list with no ID, or an ID not in the old list */
	added: TNew[];
	/** Items in the old list whose ID isn't in the new list */
	removed: TOld[];
	/** Items in both lists, paired by ID */
	matched: Array<{ oldItem: TOld; newItem: TNew }>;
}

/**
 * Compares an old and new list by a stable ID.
 *
 *   - new items with no ID, or an ID not in the old list → added
 *   - old items whose ID isn't in the new list → removed
 *   - items in both → matched, so their fields can be compared
 *
 * Old items without an ID can't be tracked, so they're ignored.
 * Order is preserved from the input lists.
 */
export function diffById<TOld, TNew>(
	oldItems: readonly TOld[],
	newItems: readonly TNew[],
	getOldId: (item: TOld) => ItemId,
	getNewId: (item: TNew) => ItemId
): ListDiff<TOld, TNew> {
	const oldById = new Map<string, TOld>();
	for (const item of oldItems) {
		const id = getOldId(item);
		if (id) oldById.set(id, item);
	}

	const newIds = new Set<string>();
	for (const item of newItems) {
		const id = getNewId(item);
		if (id) newIds.add(id);
	}

	const added: TNew[] = [];
	const matched: Array<{ oldItem: TOld; newItem: TNew }> = [];

	for (const newItem of newItems) {
		const id = getNewId(newItem);
		const oldItem = id ? oldById.get(id) : undefined;

		if (oldItem === undefined) {
			added.push(newItem);
		} else {
			matched.push({ oldItem, newItem });
		}
	}

	const removed = oldItems.filter((item) => {
		const id = getOldId(item);
		return Boolean(id) && !newIds.has(id as string);
	});

	return { added, removed, matched };
}

/**
 * Builds an update entry for one field of a list item, or returns null if
 * the formatted values are the same.
 *
 * @param base      - caseId, userId and action shared by every entry for this item
 * @param metadata  - extra metadata shared by every entry for this item (e.g. entityName)
 * @param fieldName - display name of the field, as it appears in the template
 */
export function fieldChange(
	base: Omit<AuditEntry, 'metadata'>,
	metadata: Record<string, unknown>,
	fieldName: string,
	oldValue: string,
	newValue: string
): AuditEntry | null {
	if (oldValue === newValue) {
		return null;
	}

	return {
		...base,
		metadata: { ...metadata, fieldName, oldValue, newValue }
	};
}

/**
 * Drops the nulls returned by `fieldChange` for fields that didn't change.
 */
export function compactEntries(entries: Array<AuditEntry | null>): AuditEntry[] {
	return entries.filter((entry): entry is AuditEntry => entry !== null);
}
