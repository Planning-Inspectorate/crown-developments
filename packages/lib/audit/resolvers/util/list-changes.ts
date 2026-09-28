import type { AuditAction } from '../../actions.ts';
import type { AuditEntry } from '../../types.ts';
import type { ResolverContext } from '../field-resolvers.ts';

/**
 * General engine for auditing manage lists (contacts, inspectors, etc.).
 *
 * Every list works the same way: compare the old and new lists by item ID to
 * find what was added, removed or kept, then compare each kept item field by
 * field. A data model only has to say, for each list, which actions to use,
 * how an item is named, and which fields to compare (see the app's audit
 * folder for each model's lists).
 */

/** A manage-list item, keyed the same way as the form answers. */
export type ListItem = Record<string, unknown>;

export type ItemId = string | null | undefined;

/** Returns a list item's ID, or undefined if it doesn't have one. */
export function getItemId(item: ListItem): string | undefined {
	return typeof item.id === 'string' ? item.id : undefined;
}

/**
 * Normalises a list answer to an array of items. Anything that isn't an
 * array of objects (e.g. null when a list is empty) becomes an empty list.
 */
export function toListItems(value: unknown): ListItem[] {
	if (!Array.isArray(value)) {
		return [];
	}

	return (value as unknown[]).filter((item): item is ListItem => typeof item === 'object' && item !== null);
}

/**
 * Whether a list is part of this save.
 *
 * The answers only contain the questions that were saved, so a list that
 * wasn't touched isn't there at all. A list that was emptied is still in the
 * save (as null or []), which is why this checks for the key rather than a value.
 */
export function isListInSave(answers: Record<string, unknown>, fieldName: string): boolean {
	return Object.hasOwn(answers, fieldName);
}

// ── Comparing lists ──────────────────────────────────────────────────────

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

// ── Auditing a list ──────────────────────────────────────────────────────

export interface ListActions {
	added: AuditAction;
	updated: AuditAction;
	deleted: AuditAction;
}

export interface ListFieldComparison<TItem extends ListItem = ListItem> {
	/**
	 * How the field is named in the history. It comes mid-sentence, after the
	 * item's name, so it's lowercase: e.g. 'phone number' in
	 * 'Applicant contact (Test User One) phone number was updated from …'.
	 * This is display text, not a form field name.
	 */
	label: string;
	/** Formats the field for the history, or '-' if it's empty */
	format: (item: TItem) => string;
	/** A different action for this field's updates, e.g. for multi-line values */
	action?: AuditAction;
}

export interface ListAuditConfig<TItem extends ListItem = ListItem> {
	actions: ListActions;
	/** The item's name, used in added/deleted entries and, from before the change, in updates */
	getName: (item: TItem) => string;
	/** The fields to compare on items that are in both lists */
	fields: ReadonlyArray<ListFieldComparison<TItem>>;
	/** Extra entries straight after an item's removal, e.g. an organisation's linked contacts */
	onRemoved?: (item: TItem) => AuditEntry[];
}

/**
 * Compares old and new lists and returns audit entries for additions,
 * removals, and field updates, in that order.
 *
 *   - added:   { name }
 *   - deleted: { name }, followed by anything onRemoved returns
 *   - updated: one entry per changed field, with { entityName, fieldName, oldValue, newValue }
 *
 * Update entries use the item's name from before the change as entityName,
 * so e.g. a contact whose name changed is still referred to by its old name.
 */
export function resolveListAudits<TItem extends ListItem>(
	caseId: string,
	userId: string | undefined,
	oldItems: readonly TItem[],
	newItems: readonly TItem[],
	config: ListAuditConfig<TItem>
): AuditEntry[] {
	const { actions, getName, fields, onRemoved } = config;
	const entries: AuditEntry[] = [];

	const { added, removed, matched } = diffById(oldItems, newItems, getItemId, getItemId);

	for (const item of added) {
		entries.push({ caseId, userId, action: actions.added, metadata: { name: getName(item) } });
	}

	for (const item of removed) {
		entries.push({ caseId, userId, action: actions.deleted, metadata: { name: getName(item) } });
		entries.push(...(onRemoved?.(item) ?? []));
	}

	for (const { oldItem, newItem } of matched) {
		const entityName = getName(oldItem);

		for (const field of fields) {
			const oldValue = field.format(oldItem);
			const newValue = field.format(newItem);

			if (oldValue !== newValue) {
				entries.push({
					caseId,
					userId,
					action: field.action ?? actions.updated,
					// Stored as fieldName, which is what the templates use
					metadata: { entityName, fieldName: field.label, oldValue, newValue }
				});
			}
		}
	}

	return entries;
}

// ── Each data model's lists ──────────────────────────────────────────────

/**
 * Everything a list resolver might need. Most only use the old and new
 * items; `previousCase` and `answers` are there for lookups across lists
 * (e.g. a contact's organisation name comes from the organisations list).
 */
export interface ListResolverArgs {
	caseId: string;
	userId: string | undefined;
	oldItems: ListItem[];
	newItems: ListItem[];
	previousCase: Record<string, unknown>;
	answers: Record<string, unknown>;
	/** The same context the field resolvers get, e.g. Entra user display names */
	context?: ResolverContext;
}

export interface ListResolver {
	/**
	 * The questions asked inside each list item. Their answers are saved as
	 * part of the list, so they're audited by this resolver rather than as
	 * separate fields. Used by the audit coverage tests.
	 */
	subQuestions: readonly string[];
	resolve(args: ListResolverArgs): AuditEntry[];
}

/** A data model's list resolvers, keyed by the manage-list question's fieldName. */
export type ListResolverRegistry = Readonly<Record<string, ListResolver>>;

export interface ListItemRemovalArgs {
	caseId: string;
	userId: string | undefined;
	/** The manage-list question's fieldName, e.g. 'manageApplicantContactDetails' */
	fieldName: string;
	/** The ID of the list item being removed */
	itemId: string;
	/** The case as it was before the removal (the view model) */
	previousCase: Record<string, unknown>;
	context?: ResolverContext;
}

/**
 * Returns audit entries for a single list item being removed.
 *
 * Removals go through a manage-list delete handler rather than the case save
 * handler, so there are no answers to compare against. This works out the
 * new list (the old list without the removed item) and runs the list's
 * resolver, so a removal reads the same as it would in a save.
 *
 * Returns an empty list for lists that aren't in the registry.
 */
export function resolveListItemRemoval(registry: ListResolverRegistry, args: ListItemRemovalArgs): AuditEntry[] {
	const { caseId, userId, fieldName, itemId, previousCase, context } = args;
	const listResolver = registry[fieldName];

	if (!listResolver) {
		return [];
	}

	const oldItems = toListItems(previousCase[fieldName]);
	const newItems = oldItems.filter((item) => item.id !== itemId);

	return listResolver.resolve({
		caseId,
		userId,
		oldItems,
		newItems,
		previousCase,
		// Only this list changed, so any linked lists (e.g. contacts linked to a
		// removed organisation) are recorded by this list's resolver
		answers: {},
		context
	});
}
