import { describe, it, mock } from 'node:test';
import assert from 'node:assert';
import { buildAccessibilityStatementPage } from './controller.ts';

describe('Accessibility page controller', () => {
	it('should render the Accessibility page with the correct title', () => {
		const mockReq = {} as any;
		const mockRes = {
			render: mock.fn()
		} as any;
		const accessibilityPage = buildAccessibilityStatementPage();
		accessibilityPage(mockReq, mockRes);
		assert.strictEqual(mockRes.render.mock.callCount(), 1);
		assert.strictEqual(mockRes.render.mock.calls[0].arguments[0], 'views/static/accessibility-statement/view.njk');
		assert.strictEqual(mockRes.render.mock.calls[0].arguments[1].pageTitle, 'Accessibility statement');
		assert.strictEqual(mockRes.render.mock.calls[0].arguments[1].pageHeading, 'Accessibility statement');
	});

	it('should handle missing render function in response object', () => {
		const mockReq = {};
		const mockRes = {};
		const accessibilityPage = buildAccessibilityStatementPage();
		assert.throws(() => accessibilityPage(mockReq as any, mockRes as any), /render is not a function/);
	});

	it('should handle missing res object', () => {
		const mockReq = {};
		const accessibilityPage = buildAccessibilityStatementPage();
		assert.throws(() => accessibilityPage(mockReq as any, undefined as any), /Cannot read properties of undefined/);
	});

	it('should handle render function throwing an error', () => {
		const mockReq = {};
		const mockRes = {
			render: mock.fn(() => {
				throw new Error('Render error');
			})
		};
		const accessibilityPage = buildAccessibilityStatementPage();
		assert.throws(() => accessibilityPage(mockReq as any, mockRes as any), /Render error/);
	});
});
