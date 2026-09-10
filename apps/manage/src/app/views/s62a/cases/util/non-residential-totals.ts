import { BOOLEAN_OPTIONS } from '@planning-inspectorate/dynamic-forms';
import { FLOORSPACE_SET_ID } from '@pins/crowndev-database/src/seed/s62a/data-static.ts';
import { areaFieldName, type NonResidentialFloorspaceItem, type S62aCaseViewModel } from '../view/view-model.ts';

/**
 * The sets that count toward the totals. Net tradeable area is the sales floor
 * within the shop, so counting it as well would double the same floorspace.
 */
const COUNTED_SETS: string[] = [FLOORSPACE_SET_ID.STANDARD, FLOORSPACE_SET_ID.SHOP];

/** The answers the totals are derived from. */
export type NonResidentialAnswers = Pick<
	S62aCaseViewModel,
	'hasNonResidentialFloorspaceChange' | 'manageNonResidentialFloorspace'
>;

/** One derived row, keyed by the area column it sums. */
export const FLOORSPACE_TOTAL_FIELDS = Object.freeze([
	{ field: 'existingGross', fieldName: 'totalExistingInternalFloorspace' },
	{ field: 'grossLost', fieldName: 'totalGrossInternalFloorspaceLost' },
	{ field: 'grossProposed', fieldName: 'totalGrossInternalFloorspaceProposed' },
	{ field: 'netAdditionalGross', fieldName: 'totalNetAdditionalGrossInternalFloorspace' }
] as const);

export interface NonResidentialTotals {
	existingGross?: number;
	grossLost?: number;
	grossProposed?: number;
	netAdditionalGross?: number;
}

/**
 * One area column summed across every counted set on one entry. A blank or
 * absent figure counts as zero, since the user may fill in only some.
 */
function sumEntry(item: NonResidentialFloorspaceItem, field: string): number {
	return COUNTED_SETS.reduce((total, setId) => {
		const value = Number((item as Record<string, unknown>)[areaFieldName(setId, field)]);
		return total + (Number.isFinite(value) ? value : 0);
	}, 0);
}

/**
 * The four totals, each summed across every entry. Undefined when there are no
 * entries, so the rows fall back to a dash rather than showing a zero the user
 * never gave.
 */
export function getNonResidentialTotals(answers: NonResidentialAnswers): NonResidentialTotals {
	const entries = answers.manageNonResidentialFloorspace ?? [];

	if (entries.length === 0) {
		return {};
	}

	const totals: NonResidentialTotals = {};

	for (const { field } of FLOORSPACE_TOTAL_FIELDS) {
		totals[field] = entries.reduce((total, entry) => total + sumEntry(entry, field), 0);
	}

	return totals;
}

/**
 * The derived totals as answers, for merging onto the response so the read-only
 * rows resolve them the same way any other answer is resolved.
 */
export function nonResidentialTotalAnswers(
	answers: NonResidentialAnswers,
	totals: NonResidentialTotals
): Record<string, string> {
	if (answers.hasNonResidentialFloorspaceChange !== BOOLEAN_OPTIONS.YES) {
		return {};
	}

	const derived: Record<string, string> = {};

	for (const { field, fieldName } of FLOORSPACE_TOTAL_FIELDS) {
		const total = totals[field];
		if (total !== undefined) {
			derived[fieldName] = `${total} m²`;
		}
	}

	return derived;
}
