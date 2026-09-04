import { describe, it, mock } from 'node:test';
import assert from 'node:assert';
import type { Request, Response, NextFunction } from 'express';
import { buildValidateCaseNotesMiddleware } from './validation-middleware.ts';

function makeReq(overrides: Partial<Request>): Request {
	return { session: {}, ...overrides } as unknown as Request;
}

function makeRes(): Response & { redirect: ReturnType<typeof mock.fn> } {
	return { redirect: mock.fn() } as unknown as Response & { redirect: ReturnType<typeof mock.fn> };
}

describe('buildValidateCaseNotesMiddleware', () => {
	it('should reject when the id param is missing', async () => {
		const req = makeReq({ params: {}, body: { comment: 'Valid comment' } });
		const res = makeRes();
		const next = mock.fn<NextFunction>();

		const middleware = buildValidateCaseNotesMiddleware();

		// The rejection comes from getStringParam (which runs before the local !id check)
		await assert.rejects(async () => await middleware(req, res, next));
		assert.strictEqual(next.mock.callCount(), 0);
		assert.strictEqual(res.redirect.mock.callCount(), 0);
	});

	it('should call next() when the comment is valid', async () => {
		const req = makeReq({
			params: { id: '123' },
			body: { comment: 'This is a valid comment' },
			baseUrl: '/cases/123/application-notes'
		});
		const res = makeRes();
		const next = mock.fn<NextFunction>();

		const middleware = buildValidateCaseNotesMiddleware();
		await middleware(req, res, next);

		assert.strictEqual(next.mock.callCount(), 1);
		assert.strictEqual(res.redirect.mock.callCount(), 0);
	});

	it('should redirect to the case page and not call next() when comment is empty', async () => {
		const req = makeReq({
			params: { id: '123' },
			body: { comment: '' },
			baseUrl: '/cases/123/application-notes'
		});
		const res = makeRes();
		const next = mock.fn<NextFunction>();

		const middleware = buildValidateCaseNotesMiddleware();
		await middleware(req, res, next);

		assert.strictEqual(next.mock.callCount(), 0);
		assert.strictEqual(res.redirect.mock.callCount(), 1);
		// Redirect is built from the id (/cases/:id), independent of the mount path.
		assert.deepStrictEqual(res.redirect.mock.calls[0].arguments, ['/cases/123']);
	});

	it('should record a required-answer error in the session when comment is empty', async () => {
		const cases: Record<string, Record<string, unknown>> = {};
		const req = makeReq({
			params: { id: '123' },
			body: { comment: '' },
			baseUrl: '/cases/123/application-notes',
			session: { cases } as unknown as Request['session']
		});
		const res = makeRes();
		const next = mock.fn<NextFunction>();

		const middleware = buildValidateCaseNotesMiddleware();
		await middleware(req, res, next);

		const recorded = cases['123']?.updateErrors as Array<{ text: string; href: string }> | undefined;
		assert.ok(recorded, 'expected updateErrors to be written to the cases session field');
		assert.strictEqual(recorded.length, 1);
		assert.strictEqual(recorded[0].text, 'Enter a case note');
		assert.strictEqual(recorded[0].href, '/cases/123/application-notes');
	});

	it('should redirect when comment exceeds 500 characters', async () => {
		const longComment = 'a'.repeat(501);
		const req = makeReq({
			params: { id: '123' },
			body: { comment: longComment },
			baseUrl: '/cases/123/application-notes'
		});
		const res = makeRes();
		const next = mock.fn<NextFunction>();

		const middleware = buildValidateCaseNotesMiddleware();
		await middleware(req, res, next);

		assert.strictEqual(next.mock.callCount(), 0);
		assert.strictEqual(res.redirect.mock.callCount(), 1);
	});

	it('should treat an undefined comment as a required-answer error', async () => {
		const req = makeReq({
			params: { id: '123' },
			body: {},
			baseUrl: '/cases/123/application-notes'
		});
		const res = makeRes();
		const next = mock.fn<NextFunction>();

		const middleware = buildValidateCaseNotesMiddleware();
		await middleware(req, res, next);

		assert.strictEqual(next.mock.callCount(), 0);
		assert.strictEqual(res.redirect.mock.callCount(), 1);
	});
});
