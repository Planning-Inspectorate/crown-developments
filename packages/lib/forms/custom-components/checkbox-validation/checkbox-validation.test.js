import { describe, it } from 'node:test';
import assert from 'node:assert';
import { buildRequiredCheckboxGroup, declarationItems, CheckboxValidator } from './checkbox-validation.js';

describe('checkbox-validation', () => {
	it('should display error messages for all items when none are checked', () => {
		const validator = new CheckboxValidator('Declaration');
		const state = buildRequiredCheckboxGroup([], declarationItems, { idPrefix: 'declaration', validator });
		assert.strictEqual(state.valid, false);
		assert.strictEqual(state.errors.length, declarationItems.length);
		assert.ok(state.items.every((i) => i.html.includes('govuk-error-message')));
		assert.ok(state.errorSummary.length === declarationItems.length);
	});

	it('should display error messages only for unchecked items', () => {
		const validator = new CheckboxValidator('Declaration');
		const state = buildRequiredCheckboxGroup(['consent'], declarationItems, { idPrefix: 'declaration', validator });
		const checkedItem = state.items.find((i) => i.value === 'consent');
		assert.ok(!checkedItem.html.includes('govuk-error-message'));
		const uncheckedItems = state.items.filter((i) => i.value !== 'consent');
		assert.ok(uncheckedItems.every((i) => i.html.includes('govuk-error-message')));
		assert.strictEqual(state.errors.length, declarationItems.length - 1);
	});

	it('should be valid and show no error messages when all are checked', () => {
		const validator = new CheckboxValidator('Declaration');
		const allChecked = declarationItems.map((i) => i.value);
		const state = buildRequiredCheckboxGroup(allChecked, declarationItems, { idPrefix: 'declaration', validator });
		assert.strictEqual(state.valid, true);
		assert.strictEqual(state.errors.length, 0);
		assert.ok(state.items.every((i) => !i.html.includes('govuk-error-message')));
		assert.ok(state.errorSummary.length === 0);
	});

	it('should use default error message if item errorMessage is missing', () => {
		const validator = new CheckboxValidator('Declaration', { emptyErrorMessage: 'Default error' });
		const items = [{ value: 'test', text: 'Test' }];
		const state = buildRequiredCheckboxGroup([], items, { idPrefix: 'declaration', validator });
		assert.ok(state.items[0].html.includes('Default error'));
	});
});
