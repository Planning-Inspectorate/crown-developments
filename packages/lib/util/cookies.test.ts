import { it, describe, mock } from 'node:test';
import assert from 'node:assert';
import type { Request, Response } from 'express';
import {
	buildAnalyticsCookiesMiddleware,
	DEFAULT_COOKIE_NAME_ANALYTICS_ENABLED,
	parseCookies,
	removeAnalyticsCookies,
	setAnalyticsCookiesPreference
} from './cookies.ts';

type MockRequest = Request & { session: Record<string, any> };

function createMockReq(overrides: Record<string, any> = {}): MockRequest {
	return {
		headers: {},
		session: {},
		...overrides
	} as unknown as MockRequest;
}

function createMockRes() {
	const locals: Record<string, any> = {};
	const cookie = mock.fn();
	const clearCookie = mock.fn();
	const redirect = mock.fn();

	return {
		res: { locals, cookie, clearCookie, redirect } as unknown as Response,
		locals,
		cookie,
		clearCookie,
		redirect
	};
}

describe('cookies', () => {
	describe('parseCookies', () => {
		it('should return an empty object if no cookies are present', () => {
			const req = createMockReq({ headers: {} });
			const result = parseCookies(req);
			assert.deepEqual(result, {});
		});

		it('should parse cookies from the request headers', () => {
			const req = createMockReq({ headers: { cookie: 'name=value; name2=value2' } });
			const result = parseCookies(req);
			assert.deepEqual(result, { name: 'value', name2: 'value2' });
		});
	});

	describe('buildAnalyticsCookiesMiddleware', () => {
		it('should set res.locals.analyticsCookiesEnabled to true if the cookie is present and true', () => {
			const req = createMockReq({ headers: { cookie: 'CrownDevAnalyticsEnabled=true' } });
			const { res, locals } = createMockRes();
			const middleware = buildAnalyticsCookiesMiddleware({ appHostname: 'example.com' });
			middleware(req, res, mock.fn());
			assert.strictEqual(locals.analyticsCookiesEnabled, true);
			assert.strictEqual(locals.analyticsCookiesPreferenceSet, true);
		});

		it('should set res.locals.analyticsCookiesEnabled to false if the cookie is present and false', () => {
			const req = createMockReq({ headers: { cookie: 'CrownDevAnalyticsEnabled=false' } });
			const { res, locals } = createMockRes();
			const middleware = buildAnalyticsCookiesMiddleware({ appHostname: 'example.com' });
			middleware(req, res, mock.fn());
			assert.strictEqual(locals.analyticsCookiesEnabled, false);
			assert.strictEqual(locals.analyticsCookiesPreferenceSet, true);
		});

		it('should set res.locals.analyticsCookiesEnabled to false if the cookie is not present', () => {
			const req = createMockReq();
			const { res, locals } = createMockRes();
			const middleware = buildAnalyticsCookiesMiddleware({ appHostname: 'example.com' });
			middleware(req, res, mock.fn());
			assert.strictEqual(locals.analyticsCookiesEnabled, false);
			assert.strictEqual(locals.analyticsCookiesPreferenceSet, false);
		});

		it('should support a custom cookieName', () => {
			const req = createMockReq({ headers: { cookie: 'S62aAnalyticsEnabled=true' } });
			const { res, locals } = createMockRes();
			const middleware = buildAnalyticsCookiesMiddleware({
				appHostname: 'example.com',
				cookieName: 'S62aAnalyticsEnabled'
			});
			middleware(req, res, mock.fn());
			assert.strictEqual(locals.analyticsCookiesEnabled, true);
			assert.strictEqual(locals.analyticsCookiesPreferenceSet, true);
		});

		it('should set analyticsCookiesPreferenceSetViaBanner to true if the cookie is set via the banner', () => {
			const req = createMockReq({ session: { cookies: { settings: { preferenceSetViaBanner: true } } } });
			const { res, locals } = createMockRes();
			const middleware = buildAnalyticsCookiesMiddleware({ appHostname: 'example.com' });
			middleware(req, res, mock.fn());
			assert.strictEqual(locals.analyticsCookiesPreferenceSetViaBanner, true);
			assert.strictEqual(req.session.cookies.settings.preferenceSetViaBanner, undefined);
		});

		it('should call next() to pass control to the next middleware', () => {
			const req = createMockReq();
			const { res } = createMockRes();
			const next = mock.fn();
			const middleware = buildAnalyticsCookiesMiddleware({ appHostname: 'example.com' });
			middleware(req, res, next);
			assert.strictEqual(next.mock.callCount(), 1);
		});

		describe('handle cookie banner POST', () => {
			it('should clear analytics cookies at both scopes when cookies are rejected via the banner', () => {
				const req = createMockReq({
					method: 'POST',
					body: { cookiePreference: 'reject' },
					headers: {
						cookie:
							'_ga=test; _clck=test; _clsk=test; ANONCHK=test; CLID=test; MR=test; MUID=test; SM=test; ' +
							'CrownDevAnalyticsEnabled=true; connect.sid=test'
					},
					url: '/test'
				});
				const { res, cookie, clearCookie, redirect } = createMockRes();
				const next = mock.fn();
				buildAnalyticsCookiesMiddleware({ appHostname: 'example.com' })(req, res, next);
				assert.deepStrictEqual(
					clearCookie.mock.calls.map((call) => call.arguments),
					['_ga', '_clck', '_clsk', 'ANONCHK', 'CLID', 'MR', 'MUID', 'SM'].flatMap((name) => [
						[name, { path: '/' }],
						[name, { domain: '.example.com', path: '/' }]
					])
				);
				assert.strictEqual(cookie.mock.calls[0].arguments[1], 'false');
				assert.strictEqual(req.session.cookies.settings.preferenceSetViaBanner, true);
				assert.deepStrictEqual(redirect.mock.calls[0].arguments, ['/test']);
				assert.strictEqual(next.mock.callCount(), 0);
			});

			it('should set the analytics cookies preference if cookies are accepted', () => {
				const req = createMockReq({
					method: 'POST',
					body: { cookiePreference: 'accept' },
					url: '/test'
				});
				const { res, cookie, redirect } = createMockRes();
				const next = mock.fn();
				const middleware = buildAnalyticsCookiesMiddleware({ appHostname: 'example.com' });
				middleware(req, res, next);
				assert.strictEqual(redirect.mock.callCount(), 1);
				assert.strictEqual(redirect.mock.calls[0].arguments[0], '/test');
				assert.strictEqual(cookie.mock.callCount(), 1);
				assert.strictEqual(cookie.mock.calls[0].arguments[0], DEFAULT_COOKIE_NAME_ANALYTICS_ENABLED);
				assert.strictEqual(cookie.mock.calls[0].arguments[1], 'true');
				assert.strictEqual(req.session.cookies?.settings?.preferenceSetViaBanner, true);
				assert.strictEqual(next.mock.callCount(), 0);
			});

			it('should set the analytics cookies preference if cookies are rejected', () => {
				const req = createMockReq({
					method: 'POST',
					body: { cookiePreference: 'reject' },
					url: '/test'
				});
				const { res, cookie, redirect } = createMockRes();
				const next = mock.fn();
				const middleware = buildAnalyticsCookiesMiddleware({ appHostname: 'example.com' });
				middleware(req, res, next);
				assert.strictEqual(redirect.mock.callCount(), 1);
				assert.strictEqual(redirect.mock.calls[0].arguments[0], '/test');
				assert.strictEqual(cookie.mock.callCount(), 1);
				assert.strictEqual(cookie.mock.calls[0].arguments[0], DEFAULT_COOKIE_NAME_ANALYTICS_ENABLED);
				assert.strictEqual(cookie.mock.calls[0].arguments[1], 'false');
				assert.strictEqual(req.session.cookies?.settings?.preferenceSetViaBanner, true);
				assert.strictEqual(next.mock.callCount(), 0);
			});
		});
	});

	describe('setAnalyticsCookiesPreference', () => {
		it('should not clear analytics cookies if the user opts in', () => {
			const req = createMockReq({ headers: { cookie: '_ga=test; _clck=test; _clsk=test' } });
			const { res, cookie, clearCookie } = createMockRes();
			setAnalyticsCookiesPreference(req, res, true, false, 'example.com');
			assert.strictEqual(clearCookie.mock.callCount(), 0);
			assert.strictEqual(cookie.mock.calls[0].arguments[1], 'true');
		});

		it('should set the analytics cookies preference in the response', () => {
			const req = createMockReq();
			const { res, cookie } = createMockRes();
			setAnalyticsCookiesPreference(req, res, true, false, 'example.com');
			assert.strictEqual(cookie.mock.callCount(), 1);
			assert.strictEqual(cookie.mock.calls[0].arguments[0], DEFAULT_COOKIE_NAME_ANALYTICS_ENABLED);
			assert.strictEqual(cookie.mock.calls[0].arguments[1], 'true');
		});

		it('should set the analytics cookies preference to false in the response', () => {
			const req = createMockReq();
			const { res, cookie } = createMockRes();
			setAnalyticsCookiesPreference(req, res, false, false, 'example.com');
			assert.strictEqual(cookie.mock.callCount(), 1);
			assert.strictEqual(cookie.mock.calls[0].arguments[0], DEFAULT_COOKIE_NAME_ANALYTICS_ENABLED);
			assert.strictEqual(cookie.mock.calls[0].arguments[1], 'false');
		});

		it('should clear analytics cookies if the user opts out', () => {
			const req = createMockReq({ headers: { cookie: '_ga=GA1.2.1234567890.1234567890' } });
			const { res, clearCookie } = createMockRes();
			setAnalyticsCookiesPreference(req, res, false, false, 'example.com');
			assert.strictEqual(clearCookie.mock.callCount(), 2);
		});
	});

	describe('removeAnalyticsCookies', () => {
		it('should clear only GA4, Clarity and Microsoft advertising cookies at both scopes', () => {
			const req = createMockReq({
				headers: {
					cookie:
						'_ga=test; _ga_first=test; _ga_second=test; _clck=test; _clsk=test; ' +
						'ANONCHK=test; CLID=test; MR=test; MUID=test; SM=test; ' +
						'_gateway=test; _clck_extra=test; _clsk_extra=test; CrownDevAnalyticsEnabled=false; ' +
						'connect.sid=test; _csrf=test'
				}
			});
			const { res, clearCookie } = createMockRes();
			removeAnalyticsCookies(req, res, 'example.com');
			assert.deepStrictEqual(
				clearCookie.mock.calls.map((call) => call.arguments),
				['_ga', '_ga_first', '_ga_second', '_clck', '_clsk', 'ANONCHK', 'CLID', 'MR', 'MUID', 'SM'].flatMap((name) => [
					[name, { path: '/' }],
					[name, { domain: '.example.com', path: '/' }]
				])
			);
		});

		it('should preserve an existing leading dot in the configured domain', () => {
			const req = createMockReq({ headers: { cookie: '_clck=test' } });
			const { res, clearCookie } = createMockRes();
			removeAnalyticsCookies(req, res, '.example.com');
			assert.deepStrictEqual(
				clearCookie.mock.calls.map((call) => call.arguments),
				[
					['_clck', { path: '/' }],
					['_clck', { domain: '.example.com', path: '/' }]
				]
			);
		});

		for (const cookie of [undefined, '']) {
			it(`should not clear cookies when the Cookie header is ${JSON.stringify(cookie)}`, () => {
				const req = createMockReq({ headers: { cookie } });
				const { res, clearCookie } = createMockRes();
				removeAnalyticsCookies(req, res, 'example.com');
				assert.strictEqual(clearCookie.mock.callCount(), 0);
			});
		}

		it('should clear the analytics cookies from the response', () => {
			const req = createMockReq({ headers: { cookie: '_ga=GA1.2.1234567890.1234567890' } });
			const { res, clearCookie } = createMockRes();
			removeAnalyticsCookies(req, res, 'example.com');
			assert.strictEqual(clearCookie.mock.callCount(), 2);
			assert.strictEqual(clearCookie.mock.calls[0].arguments[0], '_ga');
			assert.strictEqual(clearCookie.mock.calls[1].arguments[0], '_ga');
			assert.strictEqual(clearCookie.mock.calls[0].arguments[1].domain, undefined);
			assert.strictEqual(clearCookie.mock.calls[0].arguments[1].path, '/');
			assert.strictEqual(clearCookie.mock.calls[1].arguments[1].domain, '.example.com');
			assert.strictEqual(clearCookie.mock.calls[1].arguments[1].path, '/');
		});

		it('should not clear any other cookies', () => {
			const req = createMockReq({ headers: { cookie: 'name=value; name2=value2' } });
			const { res, clearCookie } = createMockRes();
			removeAnalyticsCookies(req, res, 'example.com');
			assert.strictEqual(clearCookie.mock.callCount(), 0);
		});
	});
});
