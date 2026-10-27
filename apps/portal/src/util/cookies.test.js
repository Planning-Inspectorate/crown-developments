import { it, describe, mock } from 'node:test';
import assert from 'node:assert';
import {
	buildAnalyticsCookiesMiddleware,
	COOKIE_NAME_ANALYTICS_ENABLED,
	parseCookies,
	removeAnalyticsCookies,
	setAnalyticsCookiesPreference
} from '#util/cookies.js';

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

	describe('buildAnalyticsCookiesMiddleware', () => {
		it('should set res.locals.analyticsCookiesEnabled to true if the cookie is present and true', () => {
			const req = { headers: { cookie: 'CrownDevAnalyticsEnabled=true' } };
			const res = { locals: {} };
			const middleware = buildAnalyticsCookiesMiddleware({});
			middleware(req, res, mock.fn());
			assert.strictEqual(res.locals.analyticsCookiesEnabled, true);
			assert.strictEqual(res.locals.analyticsCookiesPreferenceSet, true);
		});
		it('should set res.locals.analyticsCookiesEnabled to false if the cookie is present and false', () => {
			const req = { headers: { cookie: 'CrownDevAnalyticsEnabled=false' } };
			const res = { locals: {} };
			const middleware = buildAnalyticsCookiesMiddleware({});
			middleware(req, res, mock.fn());
			assert.strictEqual(res.locals.analyticsCookiesEnabled, false);
			assert.strictEqual(res.locals.analyticsCookiesPreferenceSet, true);
		});
		it('should set res.locals.analyticsCookiesEnabled to false if the cookie is not present', () => {
			const req = { headers: {} };
			const res = { locals: {} };
			const middleware = buildAnalyticsCookiesMiddleware({});
			middleware(req, res, mock.fn());
			assert.strictEqual(res.locals.analyticsCookiesEnabled, false);
			assert.strictEqual(res.locals.analyticsCookiesPreferenceSet, false);
		});
		it('should set analyticsCookiesPreferenceSetViaBanner to true if the cookie is set via the banner', () => {
			const req = { headers: {}, session: { cookies: { settings: { preferenceSetViaBanner: true } } } };
			const res = { locals: {} };
			const middleware = buildAnalyticsCookiesMiddleware({});
			middleware(req, res, mock.fn());
			assert.strictEqual(res.locals.analyticsCookiesPreferenceSetViaBanner, true);
			assert.strictEqual(req.session.cookies.settings.preferenceSetViaBanner, undefined);
		});
		it('should call next() to pass control to the next middleware', () => {
			const req = { headers: {} };
			const res = { locals: {} };
			const next = mock.fn();
			const middleware = buildAnalyticsCookiesMiddleware({});
			middleware(req, res, next);
			assert.strictEqual(next.mock.callCount(), 1);
		});
		describe('handle cookie banner POST', () => {
			it('should clear analytics cookies at both scopes when cookies are rejected via the banner', () => {
				const req = {
					method: 'POST',
					body: { cookiePreference: 'reject' },
					headers: {
						cookie:
							'_ga=test; _clck=test; _clsk=test; ANONCHK=test; CLID=test; MR=test; MUID=test; SM=test; ' +
							'CrownDevAnalyticsEnabled=true; connect.sid=test'
					},
					session: {},
					url: '/test'
				};
				const res = { cookie: mock.fn(), clearCookie: mock.fn(), redirect: mock.fn() };
				const next = mock.fn();
				buildAnalyticsCookiesMiddleware({ appHostname: 'example.com' })(req, res, next);
				assert.deepStrictEqual(
					res.clearCookie.mock.calls.map((call) => call.arguments),
					['_ga', '_clck', '_clsk', 'ANONCHK', 'CLID', 'MR', 'MUID', 'SM'].flatMap((name) => [
						[name, { path: '/' }],
						[name, { domain: '.example.com', path: '/' }]
					])
				);
				assert.strictEqual(res.cookie.mock.calls[0].arguments[1], 'false');
				assert.strictEqual(req.session.cookies.settings.preferenceSetViaBanner, true);
				assert.deepStrictEqual(res.redirect.mock.calls[0].arguments, ['/test']);
				assert.strictEqual(next.mock.callCount(), 0);
			});
			it('should set the analytics cookies preference if cookies are accepted', () => {
				const req = {
					method: 'POST',
					body: { cookiePreference: 'accept' },
					session: {},
					url: '/test'
				};
				const res = {
					cookie: mock.fn(),
					redirect: mock.fn()
				};
				const next = mock.fn();
				const middleware = buildAnalyticsCookiesMiddleware({});
				middleware(req, res, next);
				assert.strictEqual(res.redirect.mock.callCount(), 1);
				assert.strictEqual(res.redirect.mock.calls[0].arguments[0], '/test');
				assert.strictEqual(res.cookie.mock.callCount(), 1);
				assert.strictEqual(res.cookie.mock.calls[0].arguments[0], COOKIE_NAME_ANALYTICS_ENABLED);
				assert.strictEqual(res.cookie.mock.calls[0].arguments[1], 'true');
				assert.strictEqual(req.session.cookies?.settings?.preferenceSetViaBanner, true);
				assert.strictEqual(next.mock.callCount(), 0);
			});
			it('should set the analytics cookies preference if cookies are rejected', () => {
				const req = {
					method: 'POST',
					body: { cookiePreference: 'reject' },
					session: {},
					url: '/test'
				};
				const res = {
					cookie: mock.fn(),
					redirect: mock.fn()
				};
				const next = mock.fn();
				const middleware = buildAnalyticsCookiesMiddleware({});
				middleware(req, res, next);
				assert.strictEqual(res.redirect.mock.callCount(), 1);
				assert.strictEqual(res.redirect.mock.calls[0].arguments[0], '/test');
				assert.strictEqual(res.cookie.mock.callCount(), 1);
				assert.strictEqual(res.cookie.mock.calls[0].arguments[0], COOKIE_NAME_ANALYTICS_ENABLED);
				assert.strictEqual(res.cookie.mock.calls[0].arguments[1], 'false');
				assert.strictEqual(req.session.cookies?.settings?.preferenceSetViaBanner, true);
				assert.strictEqual(next.mock.callCount(), 0);
			});
		});
	});

	describe('setAnalyticsCookiesPreference', () => {
		it('should not clear analytics cookies if the user opts in', () => {
			const req = { headers: { cookie: '_ga=test; _clck=test; _clsk=test' } };
			const res = { cookie: mock.fn(), clearCookie: mock.fn() };
			setAnalyticsCookiesPreference(req, res, true, false, 'example.com');
			assert.strictEqual(res.clearCookie.mock.callCount(), 0);
			assert.strictEqual(res.cookie.mock.calls[0].arguments[1], 'true');
		});
		it('should set the analytics cookies preference in the response', () => {
			const req = { headers: {} };
			const res = { cookie: mock.fn() };
			setAnalyticsCookiesPreference(req, res, true, false, 'example.com');
			assert.strictEqual(res.cookie.mock.callCount(), 1);
			assert.strictEqual(res.cookie.mock.calls[0].arguments[0], COOKIE_NAME_ANALYTICS_ENABLED);
			assert.strictEqual(res.cookie.mock.calls[0].arguments[1], 'true');
		});
		it('should set the analytics cookies preference in the response', () => {
			const req = { headers: {} };
			const res = { cookie: mock.fn() };
			setAnalyticsCookiesPreference(req, res, false, false, 'example.com');
			assert.strictEqual(res.cookie.mock.callCount(), 1);
			assert.strictEqual(res.cookie.mock.calls[0].arguments[0], COOKIE_NAME_ANALYTICS_ENABLED);
			assert.strictEqual(res.cookie.mock.calls[0].arguments[1], 'false');
		});
		it('should clear analytics cookies if the user opts out', () => {
			const req = { headers: { cookie: '_ga=GA1.2.1234567890.1234567890' } };
			const res = { cookie: mock.fn(), clearCookie: mock.fn() };
			setAnalyticsCookiesPreference(req, res, false, false, 'example.com');
			// Two clearCookie calls: one for the cookie itself, and one for the cookie with the domain set to ".example.com"
			assert.strictEqual(res.clearCookie.mock.callCount(), 2);
		});
	});

	describe('removeAnalyticsCookies', () => {
		it('should clear only GA4, Clarity and Microsoft advertising cookies at both scopes', () => {
			const req = {
				headers: {
					cookie:
						'_ga=test; _ga_first=test; _ga_second=test; _clck=test; _clsk=test; ' +
						'ANONCHK=test; CLID=test; MR=test; MUID=test; SM=test; ' +
						'_gateway=test; _clck_extra=test; _clsk_extra=test; CrownDevAnalyticsEnabled=false; ' +
						'connect.sid=test; _csrf=test'
				}
			};
			const res = { clearCookie: mock.fn() };
			removeAnalyticsCookies(req, res, 'example.com');
			assert.deepStrictEqual(
				res.clearCookie.mock.calls.map((call) => call.arguments),
				['_ga', '_ga_first', '_ga_second', '_clck', '_clsk', 'ANONCHK', 'CLID', 'MR', 'MUID', 'SM'].flatMap((name) => [
					[name, { path: '/' }],
					[name, { domain: '.example.com', path: '/' }]
				])
			);
		});

		it('should preserve an existing leading dot in the configured domain', () => {
			const req = { headers: { cookie: '_clck=test' } };
			const res = { clearCookie: mock.fn() };
			removeAnalyticsCookies(req, res, '.example.com');
			assert.deepStrictEqual(
				res.clearCookie.mock.calls.map((call) => call.arguments),
				[
					['_clck', { path: '/' }],
					['_clck', { domain: '.example.com', path: '/' }]
				]
			);
		});

		for (const cookie of [undefined, '']) {
			it(`should not clear cookies when the Cookie header is ${JSON.stringify(cookie)}`, () => {
				const req = { headers: { cookie } };
				const res = { clearCookie: mock.fn() };
				removeAnalyticsCookies(req, res, 'example.com');
				assert.strictEqual(res.clearCookie.mock.callCount(), 0);
			});
		}

		it('should clear the analytics cookies from the response', () => {
			const req = { headers: { cookie: '_ga=GA1.2.1234567890.1234567890' } };
			const res = { clearCookie: mock.fn() };
			removeAnalyticsCookies(req, res, 'example.com');
			assert.strictEqual(res.clearCookie.mock.callCount(), 2);
			assert.strictEqual(res.clearCookie.mock.calls[0].arguments[0], '_ga');
			assert.strictEqual(res.clearCookie.mock.calls[1].arguments[0], '_ga');
			assert.strictEqual(res.clearCookie.mock.calls[0].arguments[1].domain, undefined);
			assert.strictEqual(res.clearCookie.mock.calls[0].arguments[1].path, '/');
			assert.strictEqual(res.clearCookie.mock.calls[1].arguments[1].domain, '.example.com');
			assert.strictEqual(res.clearCookie.mock.calls[1].arguments[1].path, '/');
		});
		it('should not clear any other cookies', () => {
			const req = { headers: { cookie: 'name=value; name2=value2' } };
			const res = { clearCookie: mock.fn() };
			removeAnalyticsCookies(req, res, 'example.com');
			assert.strictEqual(res.clearCookie.mock.callCount(), 0);
		});
	});
});
