/**
 * Questions whose answer is spread over several inputs (multi-field inputs).
 *
 * The form sends these keyed by each input (e.g. siteEasting, siteNorthing)
 * rather than by the question, and the view model holds them the same way.
 * Each group here pulls its parts together so a change is audited as one
 * entry for the question, e.g.
 *   'Site coordinates was updated from "Easting: 1, Northing: 2" to "Easting: 3, Northing: 2"'
 *
 * The key of each group is the question's fieldName, so its label comes from
 * the question title like any other field.
 */

export interface GroupedAuditField {
	/** The input keys that make up this question */
	parts: readonly string[];
	/** Formats the parts as one value, or '-' if none are set */
	format(values: Record<string, unknown>): string;
}

export interface GroupedFieldChange {
	/** The question's fieldName, e.g. 'siteCoordinates' */
	fieldName: string;
	oldValue: string;
	newValue: string;
}

/**
 * Returns a value as trimmed text, or undefined if it's empty.
 * Only strings and numbers are expected: strings from the form, numbers from
 * the view model. Anything else is treated as empty.
 */
function toText(value: unknown): string | undefined {
	if (typeof value === 'number') return Number.isFinite(value) ? String(value) : undefined;
	if (typeof value !== 'string') return undefined;

	const text = value.trim();
	return text === '' ? undefined : text;
}

/**
 * Like toText, but for numeric fields: numeric text is normalised, so the
 * view model's 555534 and the form's "555534" (or 10.4 and "10.40") compare
 * as equal. Not used for text that only looks numeric, like phone numbers,
 * which would lose their leading zero.
 */
function toNumberText(value: unknown): string | undefined {
	const text = toText(value);
	if (text === undefined) return undefined;

	const asNumber = Number(text);
	return Number.isFinite(asNumber) ? String(asNumber) : text;
}

function joinParts(parts: Array<string | undefined>): string {
	return parts.filter((part): part is string => Boolean(part)).join(', ') || '-';
}

function formatDays(label: string, value: unknown): string | undefined {
	const days = toNumberText(value);
	if (days === undefined) return undefined;

	return `${label}: ${days} ${Number(days) === 1 ? 'day' : 'days'}`;
}

function formatLpaContact(prefix: 'lpa' | 'secondaryLpa') {
	return (values: Record<string, unknown>): string => {
		const name = [toText(values[`${prefix}FirstName`]), toText(values[`${prefix}LastName`])].filter(Boolean).join(' ');

		return joinParts([
			name || undefined,
			toText(values[`${prefix}EmailAddress`]),
			toText(values[`${prefix}PhoneNumber`])
		]);
	};
}

export const S62A_GROUPED_FIELDS: Readonly<Record<string, GroupedAuditField>> = {
	siteCoordinates: {
		parts: ['siteEasting', 'siteNorthing'],
		format: (values) => {
			const easting = toNumberText(values.siteEasting);
			const northing = toNumberText(values.siteNorthing);

			return joinParts([
				easting === undefined ? undefined : `Easting: ${easting}`,
				northing === undefined ? undefined : `Northing: ${northing}`
			]);
		}
	},

	// Entered in either hectares or square metres, never both
	siteArea: {
		parts: ['siteAreaHectares', 'siteAreaSquareMetres'],
		format: (values) => {
			const hectares = toNumberText(values.siteAreaHectares);
			if (hectares !== undefined) return `${hectares} ha`;

			const squareMetres = toNumberText(values.siteAreaSquareMetres);
			if (squareMetres !== undefined) return `${squareMetres} m²`;

			return '-';
		}
	},

	hearingDuration: {
		parts: ['prepDuration', 'sittingDuration', 'reportingDuration'],
		format: (values) =>
			joinParts([
				formatDays('Prep', values.prepDuration),
				formatDays('Sitting', values.sittingDuration),
				formatDays('Reporting', values.reportingDuration)
			])
	},

	lpaContactDetails: {
		parts: ['lpaFirstName', 'lpaLastName', 'lpaEmailAddress', 'lpaPhoneNumber'],
		format: formatLpaContact('lpa')
	},

	secondaryLpaContactDetails: {
		parts: ['secondaryLpaFirstName', 'secondaryLpaLastName', 'secondaryLpaEmailAddress', 'secondaryLpaPhoneNumber'],
		format: formatLpaContact('secondaryLpa')
	}
};

/**
 * Works out which grouped questions changed in a save.
 *
 * A group is checked if any of its parts is in the save. The old value comes
 * from the case as it was; the new value uses the answers where a part was
 * sent, and the old value where it wasn't. Groups whose formatted values are
 * the same aren't returned.
 */
export function resolveGroupedFieldChanges(
	updatedFieldNames: readonly string[],
	previousCase: Record<string, unknown>,
	answers: Record<string, unknown>
): GroupedFieldChange[] {
	const updated = new Set(updatedFieldNames);
	const changes: GroupedFieldChange[] = [];

	for (const [fieldName, group] of Object.entries(S62A_GROUPED_FIELDS)) {
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
