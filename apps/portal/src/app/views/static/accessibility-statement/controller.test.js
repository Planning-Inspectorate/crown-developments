import { describe, it, mock } from 'node:test';
import assert from 'node:assert';
import { buildAccessibilityStatementPage } from './controller.js';

describe('Accessibility page controller', () => {
	it('should render the Accessibility page with the correct title', () => {
		const mockReq = {};
		const mockRes = {
			render: mock.fn()
		};
		const contactUsPage = buildAccessibilityStatementPage();
		contactUsPage(mockReq, mockRes);
		assert.strictEqual(mockRes.render.mock.callCount(), 1);
		assert.strictEqual(mockRes.render.mock.calls[0].arguments[0], 'views/static/accessibility-statement/view.njk');
		assert.strictEqual(mockRes.render.mock.calls[0].arguments[1].pageTitle, 'Accessibility Statement');
	});

	it('should handle missing render function in response object', () => {
		const mockReq = {};
		const mockRes = {};
		const contactUsPage = buildAccessibilityStatementPage();
		assert.throws(() => contactUsPage(mockReq, mockRes), /render is not a function/);
	});

	it('should handle missing res object', () => {
		const mockReq = {};
		const contactUsPage = buildAccessibilityStatementPage();
		assert.throws(() => contactUsPage(mockReq, undefined), /Cannot read properties of undefined/);
	});

	it('should handle render function throwing an error', () => {
		const mockReq = {};
		const mockRes = {
			render: mock.fn(() => {
				throw new Error('Render error');
			})
		};
		const contactUsPage = buildAccessibilityStatementPage();
		assert.throws(() => contactUsPage(mockReq, mockRes), /Render error/);
	});
});
