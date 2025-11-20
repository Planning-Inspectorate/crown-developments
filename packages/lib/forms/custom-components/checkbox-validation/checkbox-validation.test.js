import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
	validateRequiredCheckboxGroup,
	isValidRequiredCheckboxGroup,
	buildRequiredCheckboxGroup,
	haveYourSayDeclarationValidation,
	normaliseCheckboxValues,
	renderDeclaration,
	declarationItems
} from './checkbox-validation.js';

const items = [
	{ value: 'a', validators: [{ message: 'A required' }] },
	{ value: 'b', validators: [{ message: 'B required' }] }
];

describe('normaliseCheckboxValues', () => {
	it('should return array unchanged when already array', () => {
		const result = normaliseCheckboxValues(['x', 'y']);
		assert.deepStrictEqual(result, ['x', 'y']);
	});
	it('should wrap single non-empty string value', () => {
		const result = normaliseCheckboxValues('x');
		assert.deepStrictEqual(result, ['x']);
	});
	it('should wrap single string with spaces without trimming content', () => {
		const result = normaliseCheckboxValues('  spaced ');
		assert.deepStrictEqual(result, ['  spaced ']); // original preserved
	});
	it('should return empty array for empty string', () => {
		const result = normaliseCheckboxValues('');
		assert.deepStrictEqual(result, []);
	});
	it('should return empty array for undefined', () => {
		const result = normaliseCheckboxValues(undefined);
		assert.deepStrictEqual(result, []);
	});
	it('should return empty array unchanged when empty array provided', () => {
		const result = normaliseCheckboxValues([]);
		assert.deepStrictEqual(result, []);
	});
});

describe('renderDeclaration', () => {
	it('should render without config when none present', () => {
		const mockRes = {
			req: {},
			render: (view, data) => {
				mockRes._view = view;
				mockRes._data = data;
			}
		};
		renderDeclaration(mockRes, 'app-1', declarationItems, []);
		assert.strictEqual(mockRes._view, 'views/applications/view/have-your-say/declaration.njk');
		assert.strictEqual(mockRes._data.id, 'app-1');
		assert.ok(!('config' in mockRes._data));
	});
	it('should include config when present in app locals', () => {
		const mockRes = {
			req: { app: { locals: { config: { haveYourSayServiceName: 'Service X' } } } },
			render: (view, data) => {
				mockRes._view = view;
				mockRes._data = data;
			}
		};
		renderDeclaration(mockRes, 'app-2', declarationItems, []);
		assert.strictEqual(mockRes._data.config.haveYourSayServiceName, 'Service X');
	});
	it('should render with errorSummary undefined when not provided', () => {
		const mockRes = {
			req: {},
			render: (view, data) => {
				mockRes._view = view;
				mockRes._data = data;
			}
		};
		renderDeclaration(mockRes, 'app-3', declarationItems);
		assert.strictEqual(mockRes._data.errorSummary, undefined);
	});
});

describe('validateRequiredCheckboxGroup', () => {
	it('should return errors for all when none selected', () => {
		const errors = validateRequiredCheckboxGroup(undefined, items);
		assert.strictEqual(errors.length, 2);
		assert.deepStrictEqual(
			errors.map((e) => e.message),
			['A required', 'B required']
		);
	});
	it('should return error for missing item when partially selected', () => {
		const errors = validateRequiredCheckboxGroup(['a'], items);
		assert.strictEqual(errors.length, 1);
		assert.deepStrictEqual(errors[0], { value: 'b', message: 'B required' });
		assert.strictEqual(isValidRequiredCheckboxGroup(['a'], items), false);
	});
	it('should return no errors when all are selected', () => {
		const errors = validateRequiredCheckboxGroup(['a', 'b'], items);
		assert.strictEqual(errors.length, 0);
		assert.strictEqual(isValidRequiredCheckboxGroup(['a', 'b'], items), true);
	});
	it('should use default error message when none provided', () => {
		const bare = [{ value: 'x' }, { value: 'y' }];
		const errors = validateRequiredCheckboxGroup(undefined, bare);
		assert.deepStrictEqual(
			errors.map((e) => e.message),
			['This item is required', 'This item is required']
		);
	});
});

describe('buildRequiredCheckboxGroup', () => {
	it('should be invalid with none selected and include summary hrefs', () => {
		const state = buildRequiredCheckboxGroup(undefined, items, { idPrefix: 'grp' });
		assert.strictEqual(state.valid, false);
		assert.strictEqual(state.errorSummary.length, 2);
		state.errorSummary.forEach((e) => assert.ok(e.href.startsWith('#grp-')));
	});
	it('should mark only missing items with errors when partially selected', () => {
		const state = buildRequiredCheckboxGroup(['a'], items);
		assert.strictEqual(state.valid, false);
		assert.strictEqual(state.errors.length, 1);
		assert.strictEqual(state.errors[0].value, 'b');
	});
	it('should be valid with all selected and have no errors or summary', () => {
		const state = buildRequiredCheckboxGroup(['a', 'b'], items);
		assert.strictEqual(state.valid, true);
		assert.strictEqual(state.errors.length, 0);
		assert.strictEqual(state.errorSummary.length, 0);
	});
	it('should treat a single string value as an array', () => {
		const state = buildRequiredCheckboxGroup('a', items);
		assert.strictEqual(state.valid, false);
		assert.strictEqual(state.items[0].checked, true);
		assert.strictEqual(state.items[1].checked, false);
	});
	it('should apply default error messages when none assigned', () => {
		const bare = [{ value: 'x' }, { value: 'y' }];
		const state = buildRequiredCheckboxGroup(undefined, bare);
		assert.strictEqual(state.errors.length, 2);
		state.items.forEach((i) => assert.strictEqual(i.errorMessage.text, 'This item is required'));
	});
	it('should use custom idPrefix for errorSummary hrefs', () => {
		const state = buildRequiredCheckboxGroup(undefined, items, { idPrefix: 'custom' });
		state.errorSummary.forEach((e) => assert.ok(e.href.startsWith('#custom-')));
	});
});

describe('haveYourSayDeclarationValidation middleware', () => {
	it('should call next when the request is not a form', async () => {
		const mockReq = {
			method: 'GET',
			params: { applicationId: 'cfe3dc29-1f63-45e6-81dd-da8183842bf8' },
			body: {}
		};
		const mockRes = { render: () => {}, locals: {} };
		let nextCalled = false;
		const next = () => {
			nextCalled = true;
		};
		await haveYourSayDeclarationValidation(mockReq, mockRes, next);
		assert.strictEqual(nextCalled, true);
	});
	it('should render errors when no checkboxes selection', async () => {
		const mockReq = {
			method: 'POST',
			params: { applicationId: 'cfe3dc29-1f63-45e6-81dd-da8183842bf8' },
			body: {}
		};
		const mockRes = {
			render: (view, data) => {
				mockRes._view = view;
				mockRes._data = data;
			},
			status: () => mockRes,
			locals: {}
		};
		let nextCalled = false;
		await haveYourSayDeclarationValidation(mockReq, mockRes, () => {
			nextCalled = true;
		});
		assert.strictEqual(nextCalled, false);
		assert.strictEqual(mockRes._view, 'views/applications/view/have-your-say/declaration.njk');
		assert.ok(Array.isArray(mockRes._data.errorSummary));
		assert.strictEqual(mockRes._data.errorSummary.length, 3);
		mockRes._data.declarationItems.forEach((i) => {
			assert.ok(i.errorMessage?.text);
		});
	});
	it('should call next when all checkboxes selected', async () => {
		const mockReq = {
			method: 'POST',
			params: { applicationId: 'cfe3dc29-1f63-45e6-81dd-da8183842bf8' },
			body: { declaration: ['consent', 'connect', 'read'] }
		};
		const mockRes = {
			render: () => {
				throw new Error('Should not render on valid submission');
			},
			locals: {}
		};
		let nextCalls = 0;
		await haveYourSayDeclarationValidation(mockReq, mockRes, () => {
			nextCalls++;
		});
		assert.strictEqual(nextCalls, 1);
		assert.deepStrictEqual(mockReq.body.declaration, ['consent', 'connect', 'read']);
	});
	it('should render errors for partial selection', async () => {
		const mockReq = {
			method: 'POST',
			params: { applicationId: 'app-123' },
			body: { declaration: ['consent', 'connect'] }
		};
		const mockRes = {
			render: (view, data) => {
				mockRes._view = view;
				mockRes._data = data;
			},
			status: () => mockRes,
			locals: {}
		};
		let nextCalled = false;
		await haveYourSayDeclarationValidation(mockReq, mockRes, () => (nextCalled = true));
		assert.strictEqual(nextCalled, false);
		assert.strictEqual(mockRes._data.errorSummary.length, 1);
		assert.strictEqual(mockRes._data.errorSummary[0].href, '#declaration-read');
	});
});
