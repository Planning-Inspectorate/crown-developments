import { it, describe, mock } from 'node:test';
import assert from 'node:assert';
import { buildAnalyticsCookiesEnabledMiddleware, parseCookies } from '#util/cookies.js';

describe('cookies', () => {
	describe('parseCookies', () => {
		it('should return an empty object if no cookies are present', () => {
			const req = { headers: {} };
			const result = parseCookies(req);
			assert.deepEqual(result, {});
		});

		it('should parse cookies from the request headers', () => {
			const req = { headers: { cookie: 'name=value; name2=value2' } };
			const result = parseCookies(req);
			assert.deepEqual(result, { name: 'value', name2: 'value2' });
		});
	});

	describe('buildAnalyticsCookiesEnabledMiddleware', () => {
		it('should set res.locals.analyticsCookiesEnabled to true if the cookie is present and true', () => {
			const req = { headers: { cookie: 'CrownDevAnalyticsEnabled=true' } };
			const res = { locals: {} };
			const middleware = buildAnalyticsCookiesEnabledMiddleware();
			middleware(req, res, mock.fn());
			assert.strictEqual(res.locals.analyticsCookiesEnabled, true);
		});
		it('should set res.locals.analyticsCookiesEnabled to false if the cookie is present and false', () => {
			const req = { headers: { cookie: 'CrownDevAnalyticsEnabled=false' } };
			const res = { locals: {} };
			const middleware = buildAnalyticsCookiesEnabledMiddleware();
			middleware(req, res, mock.fn());
			assert.strictEqual(res.locals.analyticsCookiesEnabled, false);
		});
		it('should set res.locals.analyticsCookiesEnabled to false if the cookie is not present', () => {
			const req = { headers: {} };
			const res = { locals: {} };
			const middleware = buildAnalyticsCookiesEnabledMiddleware();
			middleware(req, res, mock.fn());
			assert.strictEqual(res.locals.analyticsCookiesEnabled, false);
		});
		it('should call next() to pass control to the next middleware', () => {
			const req = { headers: {} };
			const res = { locals: {} };
			const next = mock.fn();
			const middleware = buildAnalyticsCookiesEnabledMiddleware();
			middleware(req, res, next);
			assert.strictEqual(next.mock.callCount(), 1);
		});
	});
});
