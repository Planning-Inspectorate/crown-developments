import { describe, it, mock } from 'node:test';
import assert from 'node:assert';
import { buildTermsAndConditionsPage } from './controller.js';

describe('Terms and Conditions page controller', () => {
	it('should render the Terms and Conditions page with the correct title', () => {
		const mockReq = {};
		const mockRes = {
			render: mock.fn()
		};
		const termsAndConditionsPage = buildTermsAndConditionsPage();
		termsAndConditionsPage(mockReq, mockRes);
		assert.strictEqual(mockRes.render.mock.callCount(), 1);
		assert.strictEqual(mockRes.render.mock.calls[0].arguments[0], 'views/static/terms-and-conditions/view.njk');
		assert.strictEqual(mockRes.render.mock.calls[0].arguments[1].pageTitle, 'Terms and Conditions');
		assert.strictEqual(mockRes.render.mock.calls[0].arguments[1].lastUpdatedDate, '26 Mar 2025');
	});

	it('should handle missing render function in response object', () => {
		const mockReq = {};
		const mockRes = {};
		const termsAndConditionsPage = buildTermsAndConditionsPage();
		assert.throws(() => termsAndConditionsPage(mockReq, mockRes), 'render is not a function');
	});

	it('should handle missing res object', () => {
		const mockReq = {};
		const termsAndConditionsPage = buildTermsAndConditionsPage();
		assert.throws(() => termsAndConditionsPage(mockReq, undefined), /Cannot read properties of undefined/);
	});

	it('should handle render function throwing an error', () => {
		const mockReq = {};
		const mockRes = {
			render: mock.fn(() => {
				throw new Error('Render error');
			})
		};
		const termsAndConditionsPage = buildTermsAndConditionsPage();
		assert.throws(() => termsAndConditionsPage(mockReq, mockRes), /Render error/);
	});
});
