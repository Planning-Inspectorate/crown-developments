import { describe, it } from 'node:test';
import assert from 'node:assert';
import { BOOLEAN_OPTIONS } from '@planning-inspectorate/dynamic-forms';
import { OCCUPANCY_TYPE_ID } from '@pins/crowndev-database/src/seed/s62a/data-static.ts';
import type { ResidentialHousingItem } from '../view/view-model.ts';
import {
	getResidentialPrompt,
	getResidentialTotals,
	occupancyTotalFieldName,
	residentialTotalAnswers,
	sumBedroomBands,
	totalUnitsFieldName,
	type ResidentialAnswers
} from './residential-totals.ts';

/** A housing entry with every band blank unless overridden. */
function entry(overrides: Partial<ResidentialHousingItem> = {}): ResidentialHousingItem {
	return {
		id: 'entry-1',
		occupancyTypeId: OCCUPANCY_TYPE_ID.MARKET_HOUSING,
		unitTypeId: 'houses',
		bedroomsUnknown: '',
		bedroomsOne: '',
		bedroomsTwo: '',
		bedroomsThree: '',
		bedroomsFourPlus: '',
		...overrides
	};
}

/** Answers with the main gate open and both sides unanswered. */
function answers(overrides: Partial<ResidentialAnswers> = {}): ResidentialAnswers {
	return {
		hasResidentialUnitsChange: BOOLEAN_OPTIONS.YES,
		...overrides
	};
}

describe('residential-totals', () => {
	describe('sumBedroomBands', () => {
		it('sums the five bands', () => {
			const item = entry({
				bedroomsUnknown: '10',
				bedroomsOne: '12',
				bedroomsTwo: '1',
				bedroomsThree: '4',
				bedroomsFourPlus: '9'
			});

			assert.strictEqual(sumBedroomBands(item), 36);
		});

		it('counts a blank band as zero, since the user may answer only some', () => {
			assert.strictEqual(sumBedroomBands(entry({ bedroomsOne: '3' })), 3);
		});

		it('counts a zero as zero rather than treating it as unanswered', () => {
			assert.strictEqual(sumBedroomBands(entry({ bedroomsUnknown: '0', bedroomsOne: '5' })), 5);
		});

		it('ignores a non-numeric value rather than producing NaN', () => {
			assert.strictEqual(sumBedroomBands(entry({ bedroomsOne: 'abc', bedroomsTwo: '2' })), 2);
		});

		it('is zero when nothing is entered', () => {
			assert.strictEqual(sumBedroomBands(entry()), 0);
		});
	});

	describe('field names', () => {
		it('names the side totals', () => {
			assert.strictEqual(totalUnitsFieldName('existing'), 'totalExistingUnits');
			assert.strictEqual(totalUnitsFieldName('proposed'), 'totalProposedUnits');
		});

		it('prefixes a per-occupancy key with its side total, so the journey can find them by prefix', () => {
			assert.strictEqual(
				occupancyTotalFieldName('existing', OCCUPANCY_TYPE_ID.MARKET_HOUSING),
				`totalExistingUnits_${OCCUPANCY_TYPE_ID.MARKET_HOUSING}`
			);
		});
	});

	describe('getResidentialTotals - the tri-state', () => {
		it('treats an unanswered side as outstanding', () => {
			const totals = getResidentialTotals(answers());

			assert.strictEqual(totals.existing.state, 'outstanding');
			assert.strictEqual(totals.existing.total, undefined);
			assert.deepStrictEqual(totals.existing.occupancies, []);
		});

		it('treats No as a known zero, not a gap', () => {
			const totals = getResidentialTotals(answers({ hasExistingHousing: BOOLEAN_OPTIONS.NO }));

			assert.strictEqual(totals.existing.state, 'known');
			assert.strictEqual(totals.existing.total, 0);
		});

		it('treats Yes with no entries as outstanding, since the figure is not yet given', () => {
			const totals = getResidentialTotals(
				answers({ hasExistingHousing: BOOLEAN_OPTIONS.YES, manageExistingHousing: [] })
			);

			assert.strictEqual(totals.existing.state, 'outstanding');
			assert.strictEqual(totals.existing.total, undefined);
		});

		it('treats Yes with entries as known', () => {
			const totals = getResidentialTotals(
				answers({
					hasExistingHousing: BOOLEAN_OPTIONS.YES,
					manageExistingHousing: [entry({ bedroomsOne: '4' })]
				})
			);

			assert.strictEqual(totals.existing.state, 'known');
			assert.strictEqual(totals.existing.total, 4);
		});

		it('ignores entries when the side is No, so a stale list cannot produce a total', () => {
			const totals = getResidentialTotals(
				answers({
					hasExistingHousing: BOOLEAN_OPTIONS.NO,
					manageExistingHousing: [entry({ bedroomsOne: '4' })]
				})
			);

			assert.strictEqual(totals.existing.total, 0);
			assert.deepStrictEqual(totals.existing.occupancies, []);
		});
	});

	describe('getResidentialTotals - per-occupancy', () => {
		it('groups entries by occupancy and sums across unit types', () => {
			const totals = getResidentialTotals(
				answers({
					hasExistingHousing: BOOLEAN_OPTIONS.YES,
					manageExistingHousing: [
						entry({
							id: 'a',
							occupancyTypeId: OCCUPANCY_TYPE_ID.MARKET_HOUSING,
							unitTypeId: 'houses',
							bedroomsOne: '3'
						}),
						entry({
							id: 'b',
							occupancyTypeId: OCCUPANCY_TYPE_ID.MARKET_HOUSING,
							unitTypeId: 'flats',
							bedroomsTwo: '5'
						}),
						entry({ id: 'c', occupancyTypeId: OCCUPANCY_TYPE_ID.STARTER_HOMES, unitTypeId: 'houses', bedroomsOne: '2' })
					]
				})
			);

			assert.strictEqual(totals.existing.total, 10);
			assert.deepStrictEqual(
				totals.existing.occupancies.map(({ occupancyTypeId, total }) => ({ occupancyTypeId, total })),
				[
					{ occupancyTypeId: OCCUPANCY_TYPE_ID.MARKET_HOUSING, total: 8 },
					{ occupancyTypeId: OCCUPANCY_TYPE_ID.STARTER_HOMES, total: 2 }
				]
			);
		});

		it('omits occupancies with no entries', () => {
			const totals = getResidentialTotals(
				answers({
					hasExistingHousing: BOOLEAN_OPTIONS.YES,
					manageExistingHousing: [entry({ occupancyTypeId: OCCUPANCY_TYPE_ID.STARTER_HOMES, bedroomsOne: '1' })]
				})
			);

			assert.strictEqual(totals.existing.occupancies.length, 1);
			assert.strictEqual(totals.existing.occupancies[0].occupancyTypeId, OCCUPANCY_TYPE_ID.STARTER_HOMES);
		});

		it('returns occupancies in lookup order, not the order entries were added', () => {
			const totals = getResidentialTotals(
				answers({
					hasExistingHousing: BOOLEAN_OPTIONS.YES,
					manageExistingHousing: [
						entry({ id: 'a', occupancyTypeId: OCCUPANCY_TYPE_ID.STARTER_HOMES, bedroomsOne: '1' }),
						entry({ id: 'b', occupancyTypeId: OCCUPANCY_TYPE_ID.MARKET_HOUSING, bedroomsOne: '1' })
					]
				})
			);

			assert.deepStrictEqual(
				totals.existing.occupancies.map((o) => o.occupancyTypeId),
				[OCCUPANCY_TYPE_ID.MARKET_HOUSING, OCCUPANCY_TYPE_ID.STARTER_HOMES]
			);
		});

		it('carries the display name for the row label', () => {
			const totals = getResidentialTotals(
				answers({
					hasExistingHousing: BOOLEAN_OPTIONS.YES,
					manageExistingHousing: [entry({ bedroomsOne: '1' })]
				})
			);

			assert.strictEqual(typeof totals.existing.occupancies[0].displayName, 'string');
			assert.ok(totals.existing.occupancies[0].displayName.length > 0);
		});
	});

	describe('getResidentialTotals - the net', () => {
		it('is proposed minus existing when both sides are known', () => {
			const totals = getResidentialTotals(
				answers({
					hasExistingHousing: BOOLEAN_OPTIONS.YES,
					manageExistingHousing: [entry({ bedroomsOne: '4' })],
					hasProposedHousing: BOOLEAN_OPTIONS.YES,
					manageProposedHousing: [entry({ id: 'p', bedroomsOne: '10' })]
				})
			);

			assert.strictEqual(totals.net, 6);
		});

		it('is negative when the proposal loses units', () => {
			const totals = getResidentialTotals(
				answers({
					hasExistingHousing: BOOLEAN_OPTIONS.YES,
					manageExistingHousing: [entry({ bedroomsOne: '10' })],
					hasProposedHousing: BOOLEAN_OPTIONS.NO
				})
			);

			assert.strictEqual(totals.net, -10);
		});

		it('is undefined while either side is outstanding', () => {
			const totals = getResidentialTotals(
				answers({
					hasExistingHousing: BOOLEAN_OPTIONS.YES,
					manageExistingHousing: [entry({ bedroomsOne: '4' })]
				})
			);

			assert.strictEqual(totals.net, undefined);
		});

		it('calculates against zero for a No side rather than treating it as outstanding', () => {
			const totals = getResidentialTotals(
				answers({
					hasExistingHousing: BOOLEAN_OPTIONS.NO,
					hasProposedHousing: BOOLEAN_OPTIONS.YES,
					manageProposedHousing: [entry({ bedroomsOne: '7' })]
				})
			);

			assert.strictEqual(totals.net, 7);
		});

		it('is zero when both sides are No', () => {
			const totals = getResidentialTotals(
				answers({ hasExistingHousing: BOOLEAN_OPTIONS.NO, hasProposedHousing: BOOLEAN_OPTIONS.NO })
			);

			assert.strictEqual(totals.net, 0);
		});
	});

	describe('residentialTotalAnswers', () => {
		it('returns nothing when the main gate is not Yes, so no stale figure leaks onto a closed tab', () => {
			const withoutGate = answers({
				hasResidentialUnitsChange: BOOLEAN_OPTIONS.NO,
				hasExistingHousing: BOOLEAN_OPTIONS.NO,
				hasProposedHousing: BOOLEAN_OPTIONS.NO
			});

			assert.deepStrictEqual(residentialTotalAnswers(withoutGate, getResidentialTotals(withoutGate)), {});
		});

		it('returns nothing when the main gate is unanswered', () => {
			const withoutGate: ResidentialAnswers = {
				hasExistingHousing: BOOLEAN_OPTIONS.NO,
				hasProposedHousing: BOOLEAN_OPTIONS.NO
			};

			assert.deepStrictEqual(residentialTotalAnswers(withoutGate, getResidentialTotals(withoutGate)), {});
		});

		it('keys each figure by the field name its row reads', () => {
			const given = answers({
				hasExistingHousing: BOOLEAN_OPTIONS.YES,
				manageExistingHousing: [entry({ occupancyTypeId: OCCUPANCY_TYPE_ID.MARKET_HOUSING, bedroomsOne: '4' })],
				hasProposedHousing: BOOLEAN_OPTIONS.YES,
				manageProposedHousing: [entry({ id: 'p', occupancyTypeId: OCCUPANCY_TYPE_ID.STARTER_HOMES, bedroomsOne: '10' })]
			});

			assert.deepStrictEqual(residentialTotalAnswers(given, getResidentialTotals(given)), {
				totalNetGainOrLossOfUnits: '6',
				totalExistingUnits: '4',
				[`totalExistingUnits_${OCCUPANCY_TYPE_ID.MARKET_HOUSING}`]: '4',
				totalProposedUnits: '10',
				[`totalProposedUnits_${OCCUPANCY_TYPE_ID.STARTER_HOMES}`]: '10'
			});
		});

		it('omits the net rather than blanking it, so the row falls back to a dash', () => {
			const given = answers({
				hasExistingHousing: BOOLEAN_OPTIONS.YES,
				manageExistingHousing: [entry({ bedroomsOne: '4' })]
			});

			const derived = residentialTotalAnswers(given, getResidentialTotals(given));

			assert.ok(!('totalNetGainOrLossOfUnits' in derived));
			assert.ok(!('totalProposedUnits' in derived));
		});

		it('emits a zero as a string rather than omitting it', () => {
			const given = answers({ hasExistingHousing: BOOLEAN_OPTIONS.NO });

			assert.strictEqual(residentialTotalAnswers(given, getResidentialTotals(given)).totalExistingUnits, '0');
		});
	});

	describe('getResidentialPrompt', () => {
		const prompt = (overrides: Partial<ResidentialAnswers>) =>
			getResidentialPrompt(getResidentialTotals(answers(overrides)));

		it('prompts for proposed when existing is known and proposed is not', () => {
			assert.strictEqual(
				prompt({
					hasExistingHousing: BOOLEAN_OPTIONS.YES,
					manageExistingHousing: [entry({ bedroomsOne: '1' })]
				}),
				'proposed'
			);
		});

		it('prompts for existing when proposed is known and existing is not', () => {
			assert.strictEqual(
				prompt({
					hasProposedHousing: BOOLEAN_OPTIONS.YES,
					manageProposedHousing: [entry({ bedroomsOne: '1' })]
				}),
				'existing'
			);
		});

		it('prompts off a No side, since No is an answer', () => {
			assert.strictEqual(prompt({ hasExistingHousing: BOOLEAN_OPTIONS.NO }), 'proposed');
		});

		it('prompts when a side is Yes with no entries added yet', () => {
			assert.strictEqual(
				prompt({
					hasExistingHousing: BOOLEAN_OPTIONS.NO,
					hasProposedHousing: BOOLEAN_OPTIONS.YES,
					manageProposedHousing: []
				}),
				'proposed'
			);
		});

		it('does not prompt when nothing has been filled in, since the user has not started', () => {
			assert.strictEqual(prompt({}), null);
		});

		it('does not prompt when both sides are known', () => {
			assert.strictEqual(
				prompt({
					hasExistingHousing: BOOLEAN_OPTIONS.YES,
					manageExistingHousing: [entry({ bedroomsOne: '1' })],
					hasProposedHousing: BOOLEAN_OPTIONS.NO
				}),
				null
			);
		});
	});
});
