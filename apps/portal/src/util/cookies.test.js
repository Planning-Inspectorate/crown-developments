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
			assert.strictEqual(res.clearCookie.mock.callCount(), 3);
		});
	});

	describe('removeAnalyticsCookies', () => {
		it('should clear the analytics cookies from the response', () => {
			const req = { headers: { cookie: '_ga=GA1.2.1234567890.1234567890' } };
			const res = { clearCookie: mock.fn() };
			removeAnalyticsCookies(req, res, 'example.com');
			assert.strictEqual(res.clearCookie.mock.callCount(), 3);
			assert.strictEqual(res.clearCookie.mock.calls[0].arguments[0], '_ga');
			assert.strictEqual(res.clearCookie.mock.calls[1].arguments[0], '_ga');
			assert.strictEqual(res.clearCookie.mock.calls[1].arguments[1].domain, '.example.com');
			assert.strictEqual(res.clearCookie.mock.calls[1].arguments[1].secure, false);
			assert.strictEqual(res.clearCookie.mock.calls[2].arguments[1].domain, '.example.com');
			assert.strictEqual(res.clearCookie.mock.calls[2].arguments[1].secure, true);
		});
		it('should not clear any other cookies', () => {
			const req = { headers: { cookie: 'name=value; name2=value2' } };
			const res = { clearCookie: mock.fn() };
			removeAnalyticsCookies(req, res, 'example.com');
			assert.strictEqual(res.clearCookie.mock.callCount(), 0);
		});
	});
});
