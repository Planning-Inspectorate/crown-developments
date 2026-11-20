import { describe, it, mock } from 'node:test';
import assert from 'node:assert';
import { buildCookiesPage, buildCookiesSaveController } from './controller.ts';

describe('cookies', () => {
	describe('buildCookiesPage', () => {
		it('should render the cookies page with the correct title', () => {
			const mockReq = {} as any;
			const mockRes = {
				render: mock.fn()
			} as any;
			const cookiesPage = buildCookiesPage();
			cookiesPage(mockReq, mockRes);
			assert.strictEqual(mockRes.render.mock.callCount(), 1);
			assert.strictEqual(mockRes.render.mock.calls[0].arguments[0], 'views/static/cookies/view.njk');
			assert.strictEqual(mockRes.render.mock.calls[0].arguments[1].pageTitle, 'Cookies');
		});
		it('should read and clear the session data for cookies', () => {
			const mockReq = { session: { cookies: { settings: { preferenceSet: true } } } } as any;
			const mockRes = {
				render: mock.fn()
			} as any;
			const cookiesPage = buildCookiesPage();
			cookiesPage(mockReq, mockRes);
			assert.strictEqual(mockReq.session.cookies.settings.preferenceSet, undefined);
			assert.strictEqual(mockRes.render.mock.callCount(), 1);
			assert.strictEqual(mockRes.render.mock.calls[0].arguments[1].cookiePreferenceSet, true);
		});
	});
	describe('buildCookiesSaveController', () => {
		it('should redirect to the cookies page if acceptCookies is not a string', () => {
			const mockReq = { body: { acceptCookies: null }, session: {} } as any;
			const mockRes = {
				cookie: mock.fn(),
				redirect: mock.fn()
			} as any;
			const cookiesSaveController = buildCookiesSaveController({ secureSession: false } as any);
			cookiesSaveController(mockReq, mockRes);
			assert.strictEqual(mockRes.redirect.mock.callCount(), 1);
			assert.strictEqual(mockRes.redirect.mock.calls[0].arguments[0], '/cookies');
			assert.strictEqual(mockRes.cookie.mock.callCount(), 0);
		});

		it('should set the analytics cookie "true" and redirect to the cookies page', () => {
			const mockReq = { body: { acceptCookies: 'yes' }, session: {} } as any;
			const mockRes = {
				cookie: mock.fn(),
				redirect: mock.fn()
			} as any;
			const cookiesSaveController = buildCookiesSaveController({ secureSession: false } as any);
			cookiesSaveController(mockReq, mockRes);
			assert.strictEqual(mockRes.cookie.mock.callCount(), 1);
			assert.strictEqual(mockRes.cookie.mock.calls[0].arguments[0], 'CrownDevAnalyticsEnabled');
			assert.strictEqual(mockRes.cookie.mock.calls[0].arguments[1], 'true');
			assert.strictEqual(mockRes.redirect.mock.callCount(), 1);
			assert.strictEqual(mockRes.redirect.mock.calls[0].arguments[0], '/cookies');
		});
		it('should set the analytics cookie "false" and redirect to the cookies page', () => {
			const mockReq = { body: { acceptCookies: 'no' }, session: {} } as any;
			const mockRes = {
				cookie: mock.fn(),
				redirect: mock.fn()
			} as any;
			const cookiesSaveController = buildCookiesSaveController({ secureSession: false } as any);
			cookiesSaveController(mockReq, mockRes);
			assert.strictEqual(mockRes.cookie.mock.callCount(), 1);
			assert.strictEqual(mockRes.cookie.mock.calls[0].arguments[0], 'CrownDevAnalyticsEnabled');
			assert.strictEqual(mockRes.cookie.mock.calls[0].arguments[1], 'false');
			assert.strictEqual(mockRes.redirect.mock.callCount(), 1);
			assert.strictEqual(mockRes.redirect.mock.calls[0].arguments[0], '/cookies');
		});
		it('should clear GA4 and Clarity cookies if acceptCookies is "no"', () => {
			const mockReq = {
				body: { acceptCookies: 'no' },
				headers: {
					cookie:
						'_ga=notReal; otherCookie=hello; _ga_other=someValue; _clck=test; _clsk=test; ' +
						'CrownDevAnalyticsEnabled=true; connect.sid=test'
				},
				session: {}
			} as any;
			const mockRes = {
				cookie: mock.fn(),
				clearCookie: mock.fn(),
				redirect: mock.fn()
			} as any;
			const cookiesSaveController = buildCookiesSaveController({
				secureSession: false,
				appHostname: 'example.com'
			} as any);
			cookiesSaveController(mockReq, mockRes);
			assert.deepStrictEqual(
				mockRes.clearCookie.mock.calls.map((call: any) => call.arguments),
				['_ga', '_ga_other', '_clck', '_clsk'].flatMap((name) => [
					[name, { path: '/' }],
					[name, { domain: '.example.com', path: '/' }]
				])
			);
			assert.strictEqual(mockRes.cookie.mock.calls[0].arguments[1], 'false');
			assert.strictEqual(mockReq.session.cookies.settings.preferenceSet, true);
			assert.strictEqual(mockRes.redirect.mock.callCount(), 1);
			assert.strictEqual(mockRes.redirect.mock.calls[0].arguments[0], '/cookies');
		});
		it('should add session data for cookies', () => {
			const mockReq = { body: { acceptCookies: 'yes' }, session: {} } as any;
			const mockRes = {
				cookie: mock.fn(),
				redirect: mock.fn()
			} as any;
			const cookiesSaveController = buildCookiesSaveController({ secureSession: false } as any);
			cookiesSaveController(mockReq, mockRes);
			assert.strictEqual(mockReq.session.cookies.settings.preferenceSet, true);
		});
	});
});
