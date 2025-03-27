import { describe, it, mock } from 'node:test';
import assert from 'node:assert';
import { buildContactUsPage } from './controller.js';

describe('Contact Us page controller', () => {
	it('should render the Contact Us page with the correct title', () => {
		const mockReq = {};
		const mockRes = {
			render: mock.fn()
		};
		const contactUsPage = buildContactUsPage();
		contactUsPage(mockReq, mockRes);
		assert.strictEqual(mockRes.render.mock.callCount(), 1);
		assert.strictEqual(mockRes.render.mock.calls[0].arguments[0], 'views/static/contact/view.njk');
		assert.strictEqual(mockRes.render.mock.calls[0].arguments[1].pageTitle, 'Contact us');
	});

	it('should handle missing render function in response object', () => {
		const mockReq = {};
		const mockRes = {};
		const contactUsPage = buildContactUsPage();
		assert.throws(() => contactUsPage(mockReq, mockRes), /render is not a function/);
	});

	it('should handle missing res object', () => {
		const mockReq = {};
		const contactUsPage = buildContactUsPage();
		assert.throws(() => contactUsPage(mockReq, undefined), /Cannot read properties of undefined/);
	});

	it('should handle render function throwing an error', () => {
		const mockReq = {};
		const mockRes = {
			render: mock.fn(() => {
				throw new Error('Render error');
			})
		};
		const contactUsPage = buildContactUsPage();
		assert.throws(() => contactUsPage(mockReq, mockRes), /Render error/);
	});
});
