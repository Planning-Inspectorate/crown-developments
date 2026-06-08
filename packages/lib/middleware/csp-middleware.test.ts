import { describe, it, mock } from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import supertest from 'supertest';
import { initContentSecurityPolicyMiddlewares } from './csp-middleware.ts';
import type { Request, Response, NextFunction } from 'express';

describe('csp-middleware', () => {
	function createMockReqRes() {
		const req = {} as Request;
		const res = { locals: {} } as unknown as Response;
		const next = mock.fn() as unknown as NextFunction;
		return { req, res, next };
	}

	it('should return an array of 3 middlewares', () => {
		const middlewares = initContentSecurityPolicyMiddlewares({});
		assert.equal(middlewares.length, 3);
	});

	it('should set cspNonce on res.locals in the first middleware', () => {
		const middlewares = initContentSecurityPolicyMiddlewares({});
		const { req, res, next } = createMockReqRes();

		middlewares[0](req, res, next);

		assert.ok(res.locals.cspNonce);
		assert.equal(typeof res.locals.cspNonce, 'string');
		assert.equal(res.locals.cspNonce.length, 64); // 32 bytes as hex
	});

	it('should generate a unique nonce per request', () => {
		const middlewares = initContentSecurityPolicyMiddlewares({});
		const { req: req1, res: res1, next: next1 } = createMockReqRes();
		const { req: req2, res: res2, next: next2 } = createMockReqRes();

		middlewares[0](req1, res1, next1);
		middlewares[0](req2, res2, next2);

		assert.notEqual(res1.locals.cspNonce, res2.locals.cspNonce);
	});

	it('should call next() in the nonce middleware', () => {
		const middlewares = initContentSecurityPolicyMiddlewares({});
		const { req, res, next } = createMockReqRes();

		middlewares[0](req, res, next);

		assert.equal((next as unknown as { mock: { callCount: () => number } }).mock.callCount(), 1);
	});

	it('should accept custom directives without throwing', () => {
		assert.doesNotThrow(() => {
			initContentSecurityPolicyMiddlewares({
				defaultSrc: ["'self'"],
				scriptSrc: ["'self'", "'unsafe-inline'"]
			});
		});
	});

	it('should include a non-empty nonce in the CSP header from middleware-generated res.locals.cspNonce', async () => {
		const app = express();
		app.use(
			...initContentSecurityPolicyMiddlewares({
				defaultSrc: ["'self'"],
				scriptSrc: ["'self'", (_req, res) => `'nonce-${res.locals.cspNonce}'`]
			})
		);

		app.get('/csp-check', (_req, res) => {
			res.json({ cspNonce: res.locals.cspNonce });
		});

		const response = await supertest(app).get('/csp-check');
		const cspHeader = response.headers['content-security-policy'];

		assert.ok(response.body.cspNonce);
		assert.equal(typeof response.body.cspNonce, 'string');
		assert.match(response.body.cspNonce, /\S+/);
		assert.ok(cspHeader);
		assert.match(cspHeader, new RegExp(`'nonce-${response.body.cspNonce}'`));
		assert.doesNotMatch(cspHeader, /'nonce-undefined'/);
	});
});
