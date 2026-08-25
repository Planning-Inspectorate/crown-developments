import { BOOLEAN_OPTIONS } from '@planning-inspectorate/dynamic-forms';
import { OCCUPANCY_TYPES } from '@pins/crowndev-database/src/seed/s62a/data-static.ts';
import type { YesNo } from '@pins/crowndev-lib/util/types.ts';
import { HOUSING_BEDROOM_FIELDS, type ResidentialHousingItem, type S62aCaseViewModel } from '../view/view-model.ts';

export type HousingSide = 'existing' | 'proposed';

export const HOUSING_SIDES = Object.freeze(['existing', 'proposed'] as const);

/** Occupancies in display order, so per-occupancy rows match the add-to-list. */
const ORDERED_OCCUPANCY_TYPES = [...OCCUPANCY_TYPES].sort((a, b) => a.order - b.order);

/** The answers the totals are derived from. */
export type ResidentialAnswers = Pick<
	S62aCaseViewModel,
	| 'hasResidentialUnitsChange'
	| 'hasExistingHousing'
	| 'hasProposedHousing'
	| 'manageExistingHousing'
	| 'manageProposedHousing'
>;

export interface ResidentialOccupancyTotal {
	occupancyTypeId: string;
	displayName: string;
	total: number;
}

export interface ResidentialSideTotals {
	/**
	 * 'known' means the figure can be relied on - either the user answered No,
	 * or they answered Yes and added entries. 'outstanding' means the net
	 * position cannot be calculated yet.
	 */
	state: 'known' | 'outstanding';
	total?: number;
	/** One per occupancy present, in display order. Empty when outstanding. */
	occupancies: ResidentialOccupancyTotal[];
}

export interface ResidentialTotals {
	existing: ResidentialSideTotals;
	proposed: ResidentialSideTotals;
	net?: number;
}

/**
 * The units on a single housing entry, summed from the bedroom bands.
 */
export function sumBedroomBands(item: ResidentialHousingItem | Record<string, unknown>): number {
	return HOUSING_BEDROOM_FIELDS.reduce((total, fieldName) => {
		const value = Number((item as Record<string, unknown>)[fieldName]);
		return total + (Number.isFinite(value) ? value : 0);
	}, 0);
}

/** The answers key a derived side total is read from. */
export function totalUnitsFieldName(side: HousingSide): string {
	return side === 'existing' ? 'totalExistingUnits' : 'totalProposedUnits';
}

/** The answers key a derived per-occupancy total is read from. */
export function occupancyTotalFieldName(side: HousingSide, occupancyTypeId: string): string {
	return `${totalUnitsFieldName(side)}_${occupancyTypeId}`;
}

/**
 * Totals one side of the tab.
 *
 * A No answer is treated as zero. Yes with nothing added is a gap, as is
 * leaving the question unanswered.
 */
function sideTotals(hasHousing?: YesNo, items: ResidentialHousingItem[] = []): ResidentialSideTotals {
	if (hasHousing === BOOLEAN_OPTIONS.NO) {
		return { state: 'known', total: 0, occupancies: [] };
	}

	if (hasHousing !== BOOLEAN_OPTIONS.YES || items.length === 0) {
		return { state: 'outstanding', occupancies: [] };
	}

	const unitsByOccupancy = new Map<string, number>();
	for (const item of items) {
		const current = unitsByOccupancy.get(item.occupancyTypeId) ?? 0;
		unitsByOccupancy.set(item.occupancyTypeId, current + sumBedroomBands(item));
	}

	const occupancies = ORDERED_OCCUPANCY_TYPES.filter((type) => unitsByOccupancy.has(type.id)).map((type) => ({
		occupancyTypeId: type.id,
		displayName: type.displayName,
		total: unitsByOccupancy.get(type.id) ?? 0
	}));

	return {
		state: 'known',
		total: occupancies.reduce((sum, occupancy) => sum + occupancy.total, 0),
		occupancies
	};
}

/**
 * Every residential total, derived on each render so they cannot drift from the
 * entries they summarise.
 */
export function getResidentialTotals(answers: ResidentialAnswers): ResidentialTotals {
	const existing = sideTotals(answers.hasExistingHousing, answers.manageExistingHousing);
	const proposed = sideTotals(answers.hasProposedHousing, answers.manageProposedHousing);

	const net =
		existing.total !== undefined && proposed.total !== undefined ? proposed.total - existing.total : undefined;

	return { existing, proposed, net };
}

/**
 * The derived totals as answers, for merging onto the response so the read-only
 * rows resolve them the same way any other answer is resolved.
 */
export function residentialTotalAnswers(
	answers: ResidentialAnswers,
	totals: ResidentialTotals
): Record<string, string> {
	if (answers.hasResidentialUnitsChange !== BOOLEAN_OPTIONS.YES) {
		return {};
	}

	const derived: Record<string, string> = {};

	if (totals.net !== undefined) {
		derived.totalNetGainOrLossOfUnits = String(totals.net);
	}

	for (const side of HOUSING_SIDES) {
		const sideTotal = totals[side];

		if (sideTotal.total !== undefined) {
			derived[totalUnitsFieldName(side)] = String(sideTotal.total);
		}

		for (const occupancy of sideTotal.occupancies) {
			derived[occupancyTotalFieldName(side, occupancy.occupancyTypeId)] = String(occupancy.total);
		}
	}

	return derived;
}

/**
 * Which side to prompt for
 */
export function getResidentialPrompt(totals: ResidentialTotals): HousingSide | null {
	const { existing, proposed } = totals;

	if (existing.state === 'known' && proposed.state === 'outstanding') {
		return 'proposed';
	}

	if (proposed.state === 'known' && existing.state === 'outstanding') {
		return 'existing';
	}

	return null;
}
