import { describe, it, mock } from 'node:test';
import assert from 'node:assert';
import type { Request, Response, NextFunction } from 'express';
import type { S62APortalService } from '#service';
import { assertRenders404Page } from '@planning-inspectorate/core/testing';
import { firewallErrorPage, notFoundPage } from './controller.ts';

const noopNext: NextFunction = () => {};

describe('error controllers', () => {
	describe('firewallErrorPage', () => {
		it('should log a warning and render the firewall error page', () => {
			const warn = mock.fn();
			const service = { logger: { warn } } as unknown as S62APortalService;
			const mockRes = { render: mock.fn() };

			firewallErrorPage(service)({} as Request, mockRes as unknown as Response, noopNext);

			assert.strictEqual(warn.mock.callCount(), 1);
			assert.strictEqual(mockRes.render.mock.callCount(), 1);
			const [view, data] = mockRes.render.mock.calls[0].arguments as [string, Record<string, unknown>];
			assert.strictEqual(view, 'views/static/error/firewall-error.njk');
			assert.strictEqual(data.pageTitle, 'Sorry, there is a problem with the service');
		});
	});

	describe('notFoundPage', () => {
		it('should set a 404 status and render the 404 page', async () => {
			await assertRenders404Page(
				async (req: Request, res: Response) => {
					notFoundPage(req, res, noopNext);
				},
				{} as Request,
				false
			);
		});

		it('should render the s62a 404 view with the correct title', () => {
			const mockRes = { status: mock.fn(), render: mock.fn() };

			notFoundPage({} as Request, mockRes as unknown as Response, noopNext);

			assert.strictEqual(mockRes.status.mock.calls[0].arguments[0], 404);
			const [view, data] = mockRes.render.mock.calls[0].arguments as [string, Record<string, unknown>];
			assert.strictEqual(view, 'views/static/error/not-found-error.njk');
			assert.strictEqual(data.pageTitle, 'Page not found');
		});
	});
});
