/**
 * Questions whose answer is spread over several inputs (multi-field inputs).
 *
 * The form sends these keyed by each input (e.g. siteEasting, siteNorthing)
 * rather than by the question, and the view model usually holds them the
 * same way. A group pulls its parts together so a change is audited as one
 * entry for the question, not one per input.
 *
 * Each data model defines its own groups (see the app's audit folder), keyed
 * by the question's fieldName, so the label comes from the question title.
 */

export interface GroupedAuditField {
	/** The input keys that make up this question */
	parts: readonly string[];
	/** Formats the parts as one value, or '-' if none are set */
	format(values: Record<string, unknown>): string;
}

/** A data model's grouped questions, keyed by the question's fieldName. */
export type GroupedFieldRegistry = Readonly<Record<string, GroupedAuditField>>;

export interface GroupedFieldChange {
	/** The question's fieldName, e.g. 'siteCoordinates' */
	fieldName: string;
	oldValue: string;
	newValue: string;
}

/**
 * Works out which grouped questions changed in a save.
 *
 * A group is checked if any of its parts is in the save. The old value comes
 * from the case as it was; the new value uses the answers where a part was
 * sent, and the old value where it wasn't. Groups whose formatted values are
 * the same aren't returned.
 */
export function resolveGroupedFieldChanges(
	groups: GroupedFieldRegistry,
	updatedFieldNames: readonly string[],
	previousCase: Record<string, unknown>,
	answers: Record<string, unknown>
): GroupedFieldChange[] {
	const updated = new Set(updatedFieldNames);
	const changes: GroupedFieldChange[] = [];

	for (const [fieldName, group] of Object.entries(groups)) {
		if (!group.parts.some((part) => updated.has(part))) {
			continue;
		}

		const newValues = Object.fromEntries(
			group.parts.map((part) => [part, updated.has(part) ? answers[part] : previousCase[part]])
		);

		const oldValue = group.format(previousCase);
		const newValue = group.format(newValues);

		if (oldValue !== newValue) {
			changes.push({ fieldName, oldValue, newValue });
		}
	}

	return changes;
}
