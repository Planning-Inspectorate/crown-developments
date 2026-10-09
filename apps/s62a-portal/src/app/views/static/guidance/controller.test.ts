import { describe, it, mock } from 'node:test';
import assert from 'node:assert';
import { buildGuidancePage } from './controller.ts';

describe('Guidance page controller', () => {
	it('should render the Guidance page with the correct title', () => {
		const mockReq = {};
		const mockRes = {
			render: mock.fn()
		};
		const guidancePage = buildGuidancePage();
		guidancePage(mockReq, mockRes);
		assert.strictEqual(mockRes.render.mock.callCount(), 1);
		assert.strictEqual(mockRes.render.mock.calls[0].arguments[0], 'views/static/guidance/view.njk');
		assert.strictEqual(mockRes.render.mock.calls[0].arguments[1].pageTitle, 'Guidance');
	});

	it('should handle missing render function in response object', () => {
		const mockReq = {};
		const mockRes = {};
		const guidancePage = buildGuidancePage();
		assert.throws(() => guidancePage(mockReq, mockRes), /render is not a function/);
	});

	it('should handle missing res object', () => {
		const mockReq = {};
		const guidancePage = buildGuidancePage();
		assert.throws(() => guidancePage(mockReq, undefined), /Cannot read properties of undefined/);
	});

	it('should handle render function throwing an error', () => {
		const mockReq = {};
		const mockRes = {
			render: mock.fn(() => {
				throw new Error('Render error');
			})
		};
		const guidancePage = buildGuidancePage();
		assert.throws(() => guidancePage(mockReq, mockRes), /Render error/);
	});
});
