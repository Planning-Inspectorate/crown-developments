import { describe, it, mock } from 'node:test';
import assert from 'node:assert';
import type { Request, Response, NextFunction } from 'express';
import { buildTermsAndConditionsPage, formatLastUpdated, TERMS_LAST_UPDATED } from './controller.ts';

const noopNext: NextFunction = () => {};

describe('Terms and conditions page controller', () => {
	it('should render the Terms and conditions page with the correct title and date', () => {
		const mockReq = {} as Request;
		const mockRes = { render: mock.fn() };
		const handler = buildTermsAndConditionsPage();

		handler(mockReq, mockRes as unknown as Response, noopNext);

		assert.strictEqual(mockRes.render.mock.callCount(), 1);
		const [view, data] = mockRes.render.mock.calls[0].arguments as [string, Record<string, unknown>];
		assert.strictEqual(view, 'views/static/terms-and-conditions/view.njk');
		assert.strictEqual(data.pageTitle, 'Terms and conditions');
		assert.strictEqual(data.lastUpdatedDate, formatLastUpdated(TERMS_LAST_UPDATED));
	});

	it('should throw if render is not a function', () => {
		const handler = buildTermsAndConditionsPage();
		assert.throws(() => handler({} as Request, {} as Response, noopNext), /render is not a function/);
	});

	it('should throw if res is undefined', () => {
		const handler = buildTermsAndConditionsPage();
		assert.throws(
			() => handler({} as Request, undefined as unknown as Response, noopNext),
			/Cannot read properties of undefined/
		);
	});

	it('should propagate errors thrown by render', () => {
		const mockRes = {
			render: mock.fn(() => {
				throw new Error('Render error');
			})
		};
		const handler = buildTermsAndConditionsPage();
		assert.throws(() => handler({} as Request, mockRes as unknown as Response, noopNext), /Render error/);
	});
});

describe('formatLastUpdated', () => {
	it('should format dates in GOV.UK style', () => {
		assert.strictEqual(formatLastUpdated(new Date('2025-03-26T00:00:00Z')), '26 March 2025');
		assert.strictEqual(formatLastUpdated(new Date('2026-10-06T00:00:00Z')), '6 October 2026');
	});
});
