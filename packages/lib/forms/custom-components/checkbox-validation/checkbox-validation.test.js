import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
	validateRequiredCheckboxGroup,
	isValidRequiredCheckboxGroup,
	buildRequiredCheckboxGroup
} from './checkbox-validation.js';

const items = [
	{ value: 'a', validators: [{ message: 'A required' }] },
	{ value: 'b', validators: [{ message: 'B required' }] }
];

describe('validateRequiredCheckboxGroup', () => {
	it('returns errors for all when none selected', () => {
		const errors = validateRequiredCheckboxGroup(undefined, items);
		assert.strictEqual(errors.length, 2);
		assert.deepStrictEqual(
			errors.map((e) => e.message),
			['A required', 'B required']
		);
	});

	it('returns error for missing item when partially selected (array input)', () => {
		const errors = validateRequiredCheckboxGroup(['a'], items);
		assert.strictEqual(errors.length, 1);
		assert.deepStrictEqual(errors[0], { value: 'b', message: 'B required' });
		assert.strictEqual(isValidRequiredCheckboxGroup(['a'], items), false);
	});
	it('all selected: no errors', () => {
		const errors = validateRequiredCheckboxGroup(['a', 'b'], items);
		assert.strictEqual(errors.length, 0);
		assert.strictEqual(isValidRequiredCheckboxGroup(['a', 'b'], items), true);
	});
	it('default error message used when no validators or errorMessage', () => {
		const bare = [{ value: 'x' }, { value: 'y' }];
		const errors = validateRequiredCheckboxGroup(undefined, bare);
		assert.deepStrictEqual(
			errors.map((e) => e.message),
			['This item is required', 'This item is required']
		);
	});
});

describe('buildRequiredCheckboxGroup', () => {
	it('none selected -> invalid, errors + summary hrefs', () => {
		const state = buildRequiredCheckboxGroup(undefined, items, { idPrefix: 'grp' });
		assert.strictEqual(state.valid, false);
		assert.strictEqual(state.errors.length, 2);
		assert.deepStrictEqual(
			state.errorSummary.map((e) => e.href),
			['#grp-a', '#grp-b']
		);
		state.items.forEach((i) => {
			assert.strictEqual(i.checked, false);
			assert.ok(i.errorMessage?.text);
		});
	});
	it('partial selection -> only missing has errorMessage', () => {
		const state = buildRequiredCheckboxGroup(['a'], items);
		assert.strictEqual(state.valid, false);
		const aItem = state.items.find((i) => i.value === 'a');
		const bItem = state.items.find((i) => i.value === 'b');
		assert.strictEqual(aItem.checked, true);
		assert.strictEqual(aItem.errorMessage, undefined);
		assert.ok(bItem.errorMessage?.text.includes('B required'));
	});
	it('all selected -> valid, no errors or summary', () => {
		const state = buildRequiredCheckboxGroup(['a', 'b'], items);
		assert.strictEqual(state.valid, true);
		assert.strictEqual(state.errors.length, 0);
		assert.strictEqual(state.errorSummary.length, 0);
		assert.deepStrictEqual(
			state.items.map((i) => ({ value: i.value, checked: i.checked, hasError: !!i.errorMessage })),
			[
				{ value: 'a', checked: true, hasError: false },
				{ value: 'b', checked: true, hasError: false }
			]
		);
	});
	it('single string treated as array', () => {
		const state = buildRequiredCheckboxGroup('a', items);
		assert.strictEqual(state.items.find((i) => i.value === 'a').checked, true);
	});
	it('default message applied to each missing item (no validators)', () => {
		const bare = [{ value: 'x' }, { value: 'y' }];
		const state = buildRequiredCheckboxGroup(undefined, bare);
		assert.strictEqual(state.errors.length, 2);
		state.items.forEach((i) => assert.strictEqual(i.errorMessage.text, 'This item is required'));
	});
});

describe('declaration group (focused test)', () => {
	const declarationItems = [
		{ value: 'consent', errorMessage: 'Select that you agree to publish your name, comment and supporting documents' },
		{
			value: 'connect',
			errorMessage: 'Select that you agree to be contacted by email about your comment and documents'
		},
		{ value: 'read', errorMessage: 'Select that you have read and understood the Customer Privacy Notice' }
	];
	it('none selected -> all three errors with correct hrefs', () => {
		const state = buildRequiredCheckboxGroup(undefined, declarationItems, { idPrefix: 'declaration' });
		assert.strictEqual(state.valid, false);
		assert.deepStrictEqual(
			state.errorSummary.map((e) => e.href),
			['#declaration-consent', '#declaration-connect', '#declaration-read']
		);
		assert.deepStrictEqual(
			state.items.map((i) => !!i.errorMessage),
			[true, true, true]
		);
	});
});
