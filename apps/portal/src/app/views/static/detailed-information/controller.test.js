import assert from 'node:assert';
import { describe, it, mock } from 'node:test';
import { buildDetailedInformationPage } from './controller.js';

describe('Detailed Information page controller', () => {
	it('should render with the Detailed Information page with the 3 chevrons', () => {
		const mockReq = {};
		const mockRes = {
			render: mock.fn()
		};
		const detailedInformationPage = buildDetailedInformationPage();
		detailedInformationPage(mockReq, mockRes);
		assert.strictEqual(mockRes.render.mock.callCount(), 1);
		assert.strictEqual(mockRes.render.mock.calls[0].arguments[0], 'views/static/detailed-information/view.njk');
		assert.strictEqual(mockRes.render.mock.calls[0].arguments[1].chevrons.length, 3, 'Detailed Information');
	});

	it('should render the detailed information page with the right object structure', () => {
		const mockReq = {};
		const mockRes = {
			render: mock.fn()
		};
		const detailedInformationPage = buildDetailedInformationPage();
		detailedInformationPage(mockReq, mockRes);
		const chevrons = mockRes.render.mock.calls[0].arguments[1].chevrons;
		assert.ok(Array.isArray(chevrons));
		chevrons.forEach((chevron) => {
			assert.ok(
				typeof chevron.title === 'string' && chevron.title.length > 0,
				'Chevron title should be a non-empty string'
			);
			assert.ok(
				typeof chevron.href === 'string' && chevron.href.length > 0,
				'Chevron href should be a non-empty string'
			);
			assert.ok(
				typeof chevron.description === 'string' && chevron.description.length > 0,
				'Chevron description should be a non-empty string'
			);
		});
	});

	it('should handle missing render function in response object', () => {
		const mockReq = {};
		const mockRes = {};
		const detailedInformationPage = buildDetailedInformationPage();
		assert.throws(() => detailedInformationPage(mockReq, mockRes), /render is not a function/);
	});

	it('should handle missing res object', () => {
		const mockReq = {};
		const detailedInformationPage = buildDetailedInformationPage();
		assert.throws(() => detailedInformationPage(mockReq, undefined), /Cannot read properties of undefined/);
	});

	it('should handle render function throwing an error', () => {
		const mockReq = {};
		const mockRes = {
			render: mock.fn(() => {
				throw new Error('Render error');
			})
		};
		const detailedInformationPage = buildDetailedInformationPage();
		assert.throws(() => detailedInformationPage(mockReq, mockRes), /Render error/);
	});
});
