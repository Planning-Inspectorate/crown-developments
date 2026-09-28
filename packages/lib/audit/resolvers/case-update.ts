import type { AuditEntry } from '../types.ts';
import { resolveAuditAction } from '../shared-actions.ts';
import { defaultResolver, getFieldDisplayName, type ResolverContext } from './field-resolvers.ts';
import { resolveGroupedFieldChanges, type GroupedFieldRegistry } from './grouped-fields.ts';
import { toListItems, type ListResolverRegistry } from './util/list-changes.ts';
import type { FieldResolverRegistry } from './index.ts';

/**
 * Works out the case history entries for a save of a data model's case.
 *
 * Each data model only supplies its configuration (see the app's audit
 * folder); how the entries are built is the same for every model:
 *   - one entry per changed single-answer field
 *   - one entry per changed multi-field question, never one per input
 *   - entries for each manage list in the save (items added, removed or changed)
 */

export interface CaseUpdateAuditConfig {
	/** Resolvers for fields that need more than the raw value */
	fieldResolvers: FieldResolverRegistry;
	/** Single-answer fields that are audited; anything else in the save is ignored */
	auditableFields: ReadonlySet<string>;
	/** Long text fields, shown with expandable old and new values */
	longFields?: ReadonlySet<string>;
	/** Questions whose answer is spread over several inputs */
	groupedFields?: GroupedFieldRegistry;
	/** Manage lists, keyed by the list question's fieldName */
	listResolvers?: ListResolverRegistry;
	/** Labels that take priority over the question titles */
	labels?: Readonly<Record<string, string>>;
}

export interface CaseUpdateAuditArgs {
	caseId: string;
	userId: string;
	/** The field names in the save */
	updatedFieldNames: readonly string[];
	/**
	 * The case as it was before the save (the view model). The whole case,
	 * not just the changed fields, because some entries need fields that
	 * weren't changed, e.g. the rest of a multi-field question.
	 */
	previousCase: Record<string, unknown>;
	/** The answers that were saved */
	answers: Record<string, unknown>;
	config: CaseUpdateAuditConfig;
	/** Question titles by field name, used where there's no audit label */
	questionLabels?: Readonly<Record<string, string>>;
	context?: ResolverContext;
}

export function resolveCaseUpdateAudits({
	caseId,
	userId,
	updatedFieldNames,
	previousCase,
	answers,
	config,
	questionLabels = {},
	context
}: CaseUpdateAuditArgs): AuditEntry[] {
	const { fieldResolvers, auditableFields, longFields, groupedFields, listResolvers, labels = {} } = config;
	const fieldLabels = { ...questionLabels, ...labels };
	const entries: AuditEntry[] = [];

	const addEntry = (fieldName: string, oldValue: string, newValue: string, isLongField = false) => {
		entries.push({
			caseId,
			userId,
			action: resolveAuditAction(oldValue, newValue, isLongField),
			metadata: {
				fieldName: getFieldDisplayName(fieldName, fieldLabels),
				oldValue,
				newValue
			}
		});
	};

	// ── Single-answer fields ─────────────────────────────────────────────
	for (const fieldName of updatedFieldNames) {
		if (!auditableFields.has(fieldName)) {
			continue;
		}

		const resolver = fieldResolvers[fieldName] ?? defaultResolver(fieldName);
		const { oldValue, newValue } = resolver.resolve(previousCase, answers[fieldName], context);

		if (oldValue !== newValue) {
			addEntry(fieldName, oldValue, newValue, longFields?.has(fieldName));
		}
	}

	// ── Multi-field questions ────────────────────────────────────────────
	if (groupedFields) {
		for (const { fieldName, oldValue, newValue } of resolveGroupedFieldChanges(
			groupedFields,
			updatedFieldNames,
			previousCase,
			answers
		)) {
			addEntry(fieldName, oldValue, newValue);
		}
	}

	// ── Manage lists ─────────────────────────────────────────────────────
	// Each list compares the old items with the new ones; its resolver writes
	// the entries, e.g. "Test User One was added to applicant contact(s)."
	if (listResolvers) {
		for (const fieldName of updatedFieldNames) {
			const listResolver = listResolvers[fieldName];
			if (!listResolver) {
				continue;
			}

			entries.push(
				...listResolver.resolve({
					caseId,
					userId,
					oldItems: toListItems(previousCase[fieldName]),
					newItems: toListItems(answers[fieldName]),
					previousCase,
					answers,
					context
				})
			);
		}
	}

	return entries;
}
