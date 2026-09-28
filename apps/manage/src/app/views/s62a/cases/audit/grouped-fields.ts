import { joinParts, toNumberText, type GroupedFieldRegistry } from '@pins/crowndev-lib/audit/resolvers/index.ts';
import { formatContactDetails, formatDayCount } from '@pins/crowndev-lib/util/audit-formatters.ts';

/**
 * S62A questions whose answer is spread over several inputs (multi-field
 * inputs), so a change is audited as one entry for the question, e.g.
 *   'Site coordinates was updated from "Easting: 1, Northing: 2" to "Easting: 3, Northing: 2"'
 *
 * Keyed by the question's fieldName, so the label comes from the question
 * title. This only says which S62A fields make up each question and how to
 * show them; the grouping itself is done in lib.
 */
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
				formatDayCount('Prep', values.prepDuration),
				formatDayCount('Sitting', values.sittingDuration),
				formatDayCount('Reporting', values.reportingDuration)
			])
	},

	lpaContactDetails: {
		parts: ['lpaFirstName', 'lpaLastName', 'lpaEmailAddress', 'lpaPhoneNumber'],
		format: (values) =>
			formatContactDetails({
				firstName: values.lpaFirstName,
				lastName: values.lpaLastName,
				email: values.lpaEmailAddress,
				phone: values.lpaPhoneNumber
			})
	},

	secondaryLpaContactDetails: {
		parts: ['secondaryLpaFirstName', 'secondaryLpaLastName', 'secondaryLpaEmailAddress', 'secondaryLpaPhoneNumber'],
		format: (values) =>
			formatContactDetails({
				firstName: values.secondaryLpaFirstName,
				lastName: values.secondaryLpaLastName,
				email: values.secondaryLpaEmailAddress,
				phone: values.secondaryLpaPhoneNumber
			})
	}
};
