import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
	FLOORSPACE_SET_ID,
	USE_CLASSES,
	USE_CLASS_ID,
	USE_CLASS_SUBTYPES,
	USE_CLASS_SUBTYPE_ID
} from '@pins/crowndev-database/src/seed/s62a/data-static.ts';
import {
	compareFloorspaceItems,
	floorspaceQuestions,
	getSubtypeOptions,
	hasRoomsBranch,
	hasSubtypePage,
	isRetail
} from './floorspace-questions.ts';
import { areaFieldName, AREA_FIELDS, FLOORSPACE_LABELS, ROOMS_LABELS } from '../view/view-model.ts';

/** The questions as built for the tab row rather than the check page. */
const build = () => floorspaceQuestions(false);

/** The card rows that apply to a given item, as the card component filters them. */
const rowsFor = (item: Record<string, unknown>): string[] =>
	build()
		.manageFloorspace.rows.filter((row) => (row.showIf ? row.showIf(item) : true))
		.map((row) => row.label);

/** A use-class option, which may carry the Other free-text reveal. */
type UseClassOption = {
	text?: string;
	value: string;
	conditional?: { type: string; fieldName: string; label: string };
};

const useClassOptions = (): UseClassOption[] => build().useClass.options as UseClassOption[];

describe('hasSubtypePage', () => {
	it('is true for the three amalgamated use classes, which need a breakdown', () => {
		assert.strictEqual(hasSubtypePage(USE_CLASS_ID.E), true);
		assert.strictEqual(hasSubtypePage(USE_CLASS_ID.F1), true);
		assert.strictEqual(hasSubtypePage(USE_CLASS_ID.F2), true);
	});

	it('is false for the single-use classes and Other', () => {
		for (const useClassId of [
			USE_CLASS_ID.B2,
			USE_CLASS_ID.B8,
			USE_CLASS_ID.C1,
			USE_CLASS_ID.C2,
			USE_CLASS_ID.C2A,
			USE_CLASS_ID.OTHER
		]) {
			assert.strictEqual(hasSubtypePage(useClassId), false, useClassId);
		}
	});

	it('is false before a use class is chosen', () => {
		assert.strictEqual(hasSubtypePage(), false);
	});
});

describe('isRetail', () => {
	it('is true only for the retail subtype, which captures shop and net tradeable figures', () => {
		assert.strictEqual(isRetail(USE_CLASS_SUBTYPE_ID.E_RETAIL), true);
	});

	it('is false for another E subtype', () => {
		assert.strictEqual(isRetail(USE_CLASS_SUBTYPE_ID.E_OFFICE), false);
	});

	it('is false before a subtype is chosen, so the standard page is the default branch', () => {
		assert.strictEqual(isRetail(), false);
	});
});

describe('hasRoomsBranch', () => {
	it('is true for the classes measured in rooms as well as floorspace', () => {
		assert.strictEqual(hasRoomsBranch(USE_CLASS_ID.C1), true);
		assert.strictEqual(hasRoomsBranch(USE_CLASS_ID.C2), true);
		assert.strictEqual(hasRoomsBranch(USE_CLASS_ID.C2A), true);
		assert.strictEqual(hasRoomsBranch(USE_CLASS_ID.OTHER), true);
	});

	it('is false for the rest', () => {
		assert.strictEqual(hasRoomsBranch(USE_CLASS_ID.B2), false);
		assert.strictEqual(hasRoomsBranch(USE_CLASS_ID.B8), false);
		assert.strictEqual(hasRoomsBranch(USE_CLASS_ID.E), false);
	});

	it('is false before a use class is chosen', () => {
		assert.strictEqual(hasRoomsBranch(), false);
	});
});

describe('getSubtypeOptions', () => {
	it('returns only the subtypes belonging to that use class', () => {
		const values = getSubtypeOptions(USE_CLASS_ID.F2).map((option) => option.value);
		const expected = USE_CLASS_SUBTYPES.filter((subtype) => subtype.useClassId === USE_CLASS_ID.F2).map((s) => s.id);
		assert.deepStrictEqual(values, expected);
	});

	it('returns each list at its full length', () => {
		assert.strictEqual(getSubtypeOptions(USE_CLASS_ID.E).length, 11);
		assert.strictEqual(getSubtypeOptions(USE_CLASS_ID.F1).length, 7);
		assert.strictEqual(getSubtypeOptions(USE_CLASS_ID.F2).length, 4);
	});

	it('returns nothing for a use class with no subtypes', () => {
		assert.deepStrictEqual(getSubtypeOptions(USE_CLASS_ID.B2), []);
	});

	it('returns nothing when no use class is given', () => {
		assert.deepStrictEqual(getSubtypeOptions(), []);
	});

	it('orders by the lookup order rather than the order they were declared', () => {
		assert.strictEqual(getSubtypeOptions(USE_CLASS_ID.F1)[0].value, USE_CLASS_SUBTYPE_ID.F1_EDUCATION);
	});
});

describe('compareFloorspaceItems', () => {
	const b2 = { useClassId: USE_CLASS_ID.B2 };
	const e = { useClassId: USE_CLASS_ID.E };
	const other = { useClassId: USE_CLASS_ID.OTHER };

	it('orders by use class order', () => {
		assert.ok(compareFloorspaceItems(b2, e) < 0);
		assert.ok(compareFloorspaceItems(e, b2) > 0);
	});

	it('sorts an entry with no use class to the end', () => {
		assert.ok(compareFloorspaceItems({}, b2) > 0);
		assert.ok(compareFloorspaceItems(b2, {}) < 0);
	});

	it('leaves two part-built entries in their existing order', () => {
		assert.strictEqual(compareFloorspaceItems({}, {}), 0);
	});

	it('groups a list so that same-use-class entries are consecutive', () => {
		const sorted = [other, e, b2, e].sort(compareFloorspaceItems);
		assert.deepStrictEqual(
			sorted.map((entry) => entry.useClassId),
			[USE_CLASS_ID.B2, USE_CLASS_ID.E, USE_CLASS_ID.E, USE_CLASS_ID.OTHER]
		);
	});
});

describe('floorspaceQuestions', () => {
	it('returns the questions that make up the add-to-list', () => {
		assert.deepStrictEqual(Object.keys(build()), [
			'manageFloorspace',
			'useClass',
			'subtypeCommercial',
			'subtypeLearning',
			'subtypeCommunity',
			'floorspaceDetails',
			'shopFloorspace',
			'netTradeableArea',
			'roomsChange',
			'rooms'
		]);
	});

	it('titles the check page differently from the tab row', () => {
		assert.strictEqual(floorspaceQuestions(false).manageFloorspace.title, 'Type of use');
		assert.strictEqual(floorspaceQuestions(true).manageFloorspace.title, 'Check non-residential floorspace details');
	});

	it('keeps the list on one field, as one table holds every entry', () => {
		assert.strictEqual(build().manageFloorspace.fieldName, 'manageNonResidentialFloorspace');
	});

	describe('use class', () => {
		it('offers every use class', () => {
			assert.strictEqual(useClassOptions().length, USE_CLASSES.length);
		});

		it('reveals a free-text box on Other alone', () => {
			const withConditional = useClassOptions().filter((option) => option.conditional);
			assert.strictEqual(withConditional.length, 1);
			assert.strictEqual(withConditional[0].value, USE_CLASS_ID.OTHER);
		});

		it('writes the revealed text to its own field, so it survives a use class change', () => {
			const other = useClassOptions().find((option) => option.value === USE_CLASS_ID.OTHER);
			assert.strictEqual(other?.conditional?.fieldName, 'otherTypeOfUse');
		});

		it('keeps the options in lookup order', () => {
			assert.deepStrictEqual(
				useClassOptions().map((option) => option.value),
				USE_CLASSES.map((useClass) => useClass.id)
			);
		});
	});

	describe('subtype pages', () => {
		const pages = () => {
			const questions = build();
			return [questions.subtypeCommercial, questions.subtypeLearning, questions.subtypeCommunity];
		};

		it('gives each page its own url, since a question is matched back by url', () => {
			assert.deepStrictEqual(
				pages().map((page) => page.url),
				['subtype-commercial', 'subtype-learning', 'subtype-community']
			);
		});

		it('keeps the urls to a single path segment, as the journey joins parts with a slash', () => {
			for (const page of pages()) {
				assert.ok(!page.url.includes('/'), `${page.url} would break the built url`);
			}
		});

		it('writes all three to the same field, as one column holds the answer', () => {
			for (const page of pages()) {
				assert.strictEqual(page.fieldName, 'useClassSubtypeId');
			}
		});

		it('offers only its own use class options', () => {
			const [commercial, learning, community] = pages();
			assert.strictEqual(commercial.options.length, 11);
			assert.strictEqual(learning.options.length, 7);
			assert.strictEqual(community.options.length, 4);
		});

		it('words each question for its own use class', () => {
			const [commercial, learning, community] = pages();
			assert.match(commercial.question, /Commercial business and service/);
			assert.match(learning.question, /Learning/);
			assert.match(community.question, /Local community/);
		});
	});

	describe('floorspace pages', () => {
		const fieldNames = (inputFields: { fieldName: string }[]) => inputFields.map((field) => field.fieldName);

		it('gives each page the four inputs for its own set', () => {
			const questions = build();

			assert.deepStrictEqual(
				fieldNames(questions.floorspaceDetails.inputFields),
				AREA_FIELDS.map((field) => areaFieldName(FLOORSPACE_SET_ID.STANDARD, field))
			);
			assert.deepStrictEqual(
				fieldNames(questions.shopFloorspace.inputFields),
				AREA_FIELDS.map((field) => areaFieldName(FLOORSPACE_SET_ID.SHOP, field))
			);
			assert.deepStrictEqual(
				fieldNames(questions.netTradeableArea.inputFields),
				AREA_FIELDS.map((field) => areaFieldName(FLOORSPACE_SET_ID.NET_TRADEABLE, field))
			);
		});

		it('labels every set with the same four labels', () => {
			const questions = build();

			for (const question of [questions.floorspaceDetails, questions.shopFloorspace, questions.netTradeableArea]) {
				assert.deepStrictEqual(
					question.inputFields.map((field) => field.label),
					[...FLOORSPACE_LABELS]
				);
			}
		});

		it('gives each page a distinct url', () => {
			const questions = build();
			const urls = [questions.floorspaceDetails.url, questions.shopFloorspace.url, questions.netTradeableArea.url];
			assert.strictEqual(new Set(urls).size, urls.length);
		});

		it('asks for rooms as counts rather than square metres', () => {
			const [first] = build().rooms.inputFields;
			assert.strictEqual(first.suffix.text, 'rooms');
		});
	});

	describe('card rows', () => {
		const standardLabels = [...FLOORSPACE_LABELS];
		const shopLabels = FLOORSPACE_LABELS.map((label) => `Shop: ${label}`);
		const tradeableLabels = FLOORSPACE_LABELS.map((label) => `Net tradeable area: ${label}`);

		it('shows a standard entry only its four figures', () => {
			assert.deepStrictEqual(rowsFor({ useClassId: USE_CLASS_ID.B2 }), standardLabels);
		});

		it('shows a retail entry the subtype and both retail sets, and not the standard set', () => {
			const labels = rowsFor({
				useClassId: USE_CLASS_ID.E,
				useClassSubtypeId: USE_CLASS_SUBTYPE_ID.E_RETAIL
			});

			assert.deepStrictEqual(labels, ['Subtype', ...shopLabels, ...tradeableLabels]);
		});

		it('shows a non-retail E entry the standard set, since only retail branches', () => {
			const labels = rowsFor({
				useClassId: USE_CLASS_ID.E,
				useClassSubtypeId: USE_CLASS_SUBTYPE_ID.E_OFFICE
			});

			assert.deepStrictEqual(labels, ['Subtype', ...standardLabels]);
		});

		it('shows a rooms entry its rooms figures alongside the standard set', () => {
			assert.deepStrictEqual(rowsFor({ useClassId: USE_CLASS_ID.C1 }), [...standardLabels, ...ROOMS_LABELS]);
		});

		it('shows Other the rooms figures too, as it takes the rooms branch', () => {
			assert.deepStrictEqual(rowsFor({ useClassId: USE_CLASS_ID.OTHER }), [...standardLabels, ...ROOMS_LABELS]);
		});

		it('hides the subtype row on a use class that has none', () => {
			assert.ok(!rowsFor({ useClassId: USE_CLASS_ID.C1 }).includes('Subtype'));
		});

		it('shows a part-built entry the standard set, which is the default branch', () => {
			assert.deepStrictEqual(rowsFor({}), standardLabels);
		});
	});

	describe('card title', () => {
		const title = (item: Record<string, unknown>) =>
			build().manageFloorspace.cardTitle(item, {
				getFormatted: (fieldName: string) => String(item[fieldName] ?? '')
			});

		it('names a card by its use class', () => {
			assert.strictEqual(title({ useClassId: USE_CLASS_ID.B2 }), USE_CLASS_ID.B2);
		});

		it('names an Other card by the free text, which is more use than "Other"', () => {
			assert.strictEqual(title({ useClassId: USE_CLASS_ID.OTHER, otherTypeOfUse: 'Petrol station' }), 'Petrol station');
		});

		it('falls back to the use class when Other has no text yet', () => {
			assert.strictEqual(title({ useClassId: USE_CLASS_ID.OTHER }), USE_CLASS_ID.OTHER);
		});
	});
});
