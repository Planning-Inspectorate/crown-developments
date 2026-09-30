import {
	joinParts,
	toNumberText,
	toText,
	type GroupedFieldRegistry
} from '@pins/crowndev-lib/audit/resolvers/index.ts';

/**
 * S62A questions whose answer is spread over several inputs (multi-field
 * inputs), so a change is audited as one entry for the question, e.g.
 *   'Site coordinates was updated from "Easting: 1, Northing: 2" to "Easting: 3, Northing: 2"'
 *
 * Keyed by the question's fieldName, so the label comes from the question
 * title. The grouping itself is done by resolveGroupedFieldChanges in lib.
 */

function formatDays(label: string, value: unknown): string | undefined {
	const days = toNumberText(value);
	if (days === undefined) return undefined;

	return `${label}: ${days} ${Number(days) === 1 ? 'day' : 'days'}`;
}

function formatLpaContact(prefix: 'lpa' | 'secondaryLpa') {
	return (values: Record<string, unknown>): string => {
		const name = [toText(values[`${prefix}FirstName`]), toText(values[`${prefix}LastName`])].filter(Boolean).join(' ');

		// Phone numbers use toText, not toNumberText, so they keep their leading zero
		return joinParts([
			name || undefined,
			toText(values[`${prefix}EmailAddress`]),
			toText(values[`${prefix}PhoneNumber`])
		]);
	};
}

export const S62A_GROUPED_FIELDS: GroupedFieldRegistry = {
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
