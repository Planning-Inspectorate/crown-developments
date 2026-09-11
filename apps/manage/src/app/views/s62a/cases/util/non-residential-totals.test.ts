import { describe, it } from 'node:test';
import assert from 'node:assert';
import { BOOLEAN_OPTIONS } from '@planning-inspectorate/dynamic-forms';
import { FLOORSPACE_SET_ID, USE_CLASS_ID } from '@pins/crowndev-database/src/seed/s62a/data-static.ts';
import { areaFieldName, type NonResidentialFloorspaceItem } from '../view/view-model.ts';
import {
	getNonResidentialTotals,
	nonResidentialTotalAnswers,
	type NonResidentialAnswers
} from './non-residential-totals.ts';

/** A floorspace entry carrying figures for one or more sets. */
function entry(
	sets: Record<string, Record<string, string>>,
	overrides: Record<string, unknown> = {}
): NonResidentialFloorspaceItem {
	const item: Record<string, unknown> = { id: 'entry-1', useClassId: USE_CLASS_ID.B2, ...overrides };

	for (const [setId, figures] of Object.entries(sets)) {
		for (const [field, value] of Object.entries(figures)) {
			item[areaFieldName(setId, field)] = value;
		}
	}

	return item as NonResidentialFloorspaceItem;
}

/** A standard entry with all four figures filled in. */
const standardEntry = (figures: Record<string, string>, overrides: Record<string, unknown> = {}) =>
	entry({ [FLOORSPACE_SET_ID.STANDARD]: figures }, overrides);

/** Answers with the gate open and the given entries. */
const answers = (manageNonResidentialFloorspace: NonResidentialFloorspaceItem[]): NonResidentialAnswers => ({
	hasNonResidentialFloorspaceChange: BOOLEAN_OPTIONS.YES,
	manageNonResidentialFloorspace
});

describe('getNonResidentialTotals', () => {
	it('returns nothing when there are no entries, so the rows show a dash', () => {
		assert.deepStrictEqual(getNonResidentialTotals(answers([])), {});
	});

	it('returns nothing when the list is absent from the answers', () => {
		assert.deepStrictEqual(getNonResidentialTotals({ hasNonResidentialFloorspaceChange: BOOLEAN_OPTIONS.YES }), {});
	});

	it('sums each of the four columns across every entry', () => {
		const totals = getNonResidentialTotals(
			answers([
				standardEntry({ existingGross: '100', grossLost: '20', grossProposed: '250', netAdditionalGross: '130' }),
				standardEntry(
					{ existingGross: '50', grossLost: '10', grossProposed: '80', netAdditionalGross: '20' },
					{
						id: 'entry-2'
					}
				)
			])
		);

		assert.deepStrictEqual(totals, {
			existingGross: 150,
			grossLost: 30,
			grossProposed: 330,
			netAdditionalGross: 150
		});
	});

	it('counts a single entry as its own total', () => {
		const totals = getNonResidentialTotals(answers([standardEntry({ existingGross: '334' })]));

		assert.strictEqual(totals.existingGross, 334);
	});

	it('counts a retail entry through its shop figures, which replace the standard set', () => {
		const totals = getNonResidentialTotals(
			answers([entry({ [FLOORSPACE_SET_ID.SHOP]: { existingGross: '300' } }, { useClassId: USE_CLASS_ID.E })])
		);

		assert.strictEqual(totals.existingGross, 300);
	});

	it('ignores the net tradeable area, which sits inside the shop floorspace already counted', () => {
		const totals = getNonResidentialTotals(
			answers([
				entry(
					{
						[FLOORSPACE_SET_ID.SHOP]: { existingGross: '300' },
						[FLOORSPACE_SET_ID.NET_TRADEABLE]: { existingGross: '200' }
					},
					{ useClassId: USE_CLASS_ID.E }
				)
			])
		);

		assert.strictEqual(totals.existingGross, 300, 'counting both would double the same floorspace');
	});

	it('adds a retail entry to a standard one without double counting either', () => {
		const totals = getNonResidentialTotals(
			answers([
				standardEntry({ existingGross: '100' }),
				entry(
					{
						[FLOORSPACE_SET_ID.SHOP]: { existingGross: '300' },
						[FLOORSPACE_SET_ID.NET_TRADEABLE]: { existingGross: '200' }
					},
					{ id: 'entry-2', useClassId: USE_CLASS_ID.E }
				)
			])
		);

		assert.strictEqual(totals.existingGross, 400);
	});

	it('counts a blank figure as zero, since the user may fill in only some', () => {
		const totals = getNonResidentialTotals(answers([standardEntry({ existingGross: '100', grossLost: '' })]));

		assert.strictEqual(totals.existingGross, 100);
		assert.strictEqual(totals.grossLost, 0);
	});

	it('counts a column no entry answered as zero', () => {
		const totals = getNonResidentialTotals(answers([standardEntry({ existingGross: '334' })]));

		assert.strictEqual(totals.grossLost, 0);
		assert.strictEqual(totals.grossProposed, 0);
		assert.strictEqual(totals.netAdditionalGross, 0);
	});

	it('is zero throughout for an entry with nothing filled in', () => {
		assert.deepStrictEqual(getNonResidentialTotals(answers([standardEntry({})])), {
			existingGross: 0,
			grossLost: 0,
			grossProposed: 0,
			netAdditionalGross: 0
		});
	});

	it('counts a zero as zero rather than treating it as unanswered', () => {
		const totals = getNonResidentialTotals(
			answers([standardEntry({ existingGross: '0' }), standardEntry({ existingGross: '5' }, { id: 'entry-2' })])
		);

		assert.strictEqual(totals.existingGross, 5);
	});

	it('ignores a non-numeric value rather than producing NaN', () => {
		const totals = getNonResidentialTotals(answers([standardEntry({ existingGross: 'abc', grossLost: '20' })]));

		assert.strictEqual(totals.existingGross, 0);
		assert.strictEqual(totals.grossLost, 20);
	});

	it('takes the net from the entries rather than deriving it from the other three', () => {
		// Each entry carries its own net figure; it is not proposed minus existing.
		const totals = getNonResidentialTotals(
			answers([
				standardEntry({ existingGross: '100', grossLost: '20', grossProposed: '250', netAdditionalGross: '999' })
			])
		);

		assert.strictEqual(totals.netAdditionalGross, 999);
	});

	it('recalculates from the entries each time, so a changed figure cannot go stale', () => {
		const before = getNonResidentialTotals(answers([standardEntry({ existingGross: '100' })]));
		const after = getNonResidentialTotals(answers([standardEntry({ existingGross: '250' })]));

		assert.strictEqual(before.existingGross, 100);
		assert.strictEqual(after.existingGross, 250);
	});
});

describe('nonResidentialTotalAnswers', () => {
	const derivedFor = (overrides: Partial<NonResidentialAnswers> = {}) => {
		const merged = { ...answers([standardEntry({ existingGross: '100' })]), ...overrides };
		return nonResidentialTotalAnswers(merged, getNonResidentialTotals(merged));
	};

	it('keys each figure by the field name its row reads', () => {
		const merged = answers([
			standardEntry({ existingGross: '100', grossLost: '20', grossProposed: '250', netAdditionalGross: '130' })
		]);

		assert.deepStrictEqual(nonResidentialTotalAnswers(merged, getNonResidentialTotals(merged)), {
			totalExistingInternalFloorspace: '100 m²',
			totalGrossInternalFloorspaceLost: '20 m²',
			totalGrossInternalFloorspaceProposed: '250 m²',
			totalNetAdditionalGrossInternalFloorspace: '130 m²'
		});
	});

	it('suffixes the figures with square metres, matching the unit on the entry pages', () => {
		assert.strictEqual(derivedFor().totalExistingInternalFloorspace, '100 m²');
	});

	it('emits a zero as a string rather than omitting it', () => {
		assert.strictEqual(
			derivedFor({ manageNonResidentialFloorspace: [standardEntry({})] }).totalExistingInternalFloorspace,
			'0 m²'
		);
	});

	it('returns nothing when there are no entries, so the rows fall back to a dash', () => {
		assert.deepStrictEqual(derivedFor({ manageNonResidentialFloorspace: [] }), {});
	});

	it('returns nothing when the gate is No, so no stale figure leaks onto a closed tab', () => {
		assert.deepStrictEqual(derivedFor({ hasNonResidentialFloorspaceChange: BOOLEAN_OPTIONS.NO }), {});
	});

	it('returns nothing when the gate is unanswered', () => {
		assert.deepStrictEqual(derivedFor({ hasNonResidentialFloorspaceChange: undefined }), {});
	});

	it('does not emit the residential totals, which are derived separately', () => {
		const derived = derivedFor();

		assert.ok(!('totalExistingUnits' in derived));
		assert.ok(!('totalNetGainOrLossOfUnits' in derived));
	});
});
