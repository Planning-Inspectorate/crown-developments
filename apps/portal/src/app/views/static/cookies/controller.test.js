import { describe, it, mock } from 'node:test';
import assert from 'node:assert';
import { buildCookiesPage, buildCookiesSaveController } from './controller.js';

describe('cookies', () => {
	describe('buildCookiesPage', () => {
		it('should render the cookies page with the correct title', () => {
			const mockReq = {};
			const mockRes = {
				render: mock.fn()
			};
			const cookiesPage = buildCookiesPage();
			cookiesPage(mockReq, mockRes);
			assert.strictEqual(mockRes.render.mock.callCount(), 1);
			assert.strictEqual(mockRes.render.mock.calls[0].arguments[0], 'views/static/cookies/view.njk');
			assert.strictEqual(mockRes.render.mock.calls[0].arguments[1].pageTitle, 'Cookies');
		});
		it('should read and clear the session data for cookies', () => {
			const mockReq = { session: { cookies: { settings: { preferenceSet: true } } } };
			const mockRes = {
				render: mock.fn()
			};
			const cookiesPage = buildCookiesPage();
			cookiesPage(mockReq, mockRes);
			assert.strictEqual(mockReq.session.cookies.settings.preferenceSet, undefined);
			assert.strictEqual(mockRes.render.mock.callCount(), 1);
			assert.strictEqual(mockRes.render.mock.calls[0].arguments[1].cookiePreferenceSet, true);
		});
	});
	describe('buildCookiesSaveController', () => {
		it('should redirect to the cookies page if acceptCookies is not a string', () => {
			const mockReq = { body: { acceptCookies: null }, session: {} };
			const mockRes = {
				cookie: mock.fn(),
				redirect: mock.fn()
			};
			const cookiesSaveController = buildCookiesSaveController({ secureSession: false });
			cookiesSaveController(mockReq, mockRes);
			assert.strictEqual(mockRes.redirect.mock.callCount(), 1);
			assert.strictEqual(mockRes.redirect.mock.calls[0].arguments[0], '/cookies');
			assert.strictEqual(mockRes.cookie.mock.callCount(), 0);
		});

		it('should set the analytics cookie "true" and redirect to the cookies page', () => {
			const mockReq = { body: { acceptCookies: 'yes' }, session: {} };
			const mockRes = {
				cookie: mock.fn(),
				redirect: mock.fn()
			};
			const cookiesSaveController = buildCookiesSaveController({ secureSession: false });
			cookiesSaveController(mockReq, mockRes);
			assert.strictEqual(mockRes.cookie.mock.callCount(), 1);
			assert.strictEqual(mockRes.cookie.mock.calls[0].arguments[0], 'CrownDevAnalyticsEnabled');
			assert.strictEqual(mockRes.cookie.mock.calls[0].arguments[1], 'true');
			assert.strictEqual(mockRes.redirect.mock.callCount(), 1);
			assert.strictEqual(mockRes.redirect.mock.calls[0].arguments[0], '/cookies');
		});
		it('should set the analytics cookie "false" and redirect to the cookies page', () => {
			const mockReq = { body: { acceptCookies: 'no' }, session: {} };
			const mockRes = {
				cookie: mock.fn(),
				redirect: mock.fn()
			};
			const cookiesSaveController = buildCookiesSaveController({ secureSession: false });
			cookiesSaveController(mockReq, mockRes);
			assert.strictEqual(mockRes.cookie.mock.callCount(), 1);
			assert.strictEqual(mockRes.cookie.mock.calls[0].arguments[0], 'CrownDevAnalyticsEnabled');
			assert.strictEqual(mockRes.cookie.mock.calls[0].arguments[1], 'false');
			assert.strictEqual(mockRes.redirect.mock.callCount(), 1);
			assert.strictEqual(mockRes.redirect.mock.calls[0].arguments[0], '/cookies');
		});
		it('should clear GA4 cookies if acceptCookies is "no"', () => {
			const mockReq = {
				body: { acceptCookies: 'no' },
				headers: { cookie: '_ga=notReal; otherCookie=hello; _ga_other=someValue' },
				session: {}
			};
			const mockRes = {
				cookie: mock.fn(),
				clearCookie: mock.fn(),
				redirect: mock.fn()
			};
			const cookiesSaveController = buildCookiesSaveController({ secureSession: false });
			cookiesSaveController(mockReq, mockRes);
			assert.strictEqual(mockRes.clearCookie.mock.callCount(), 2);
			assert.strictEqual(mockRes.clearCookie.mock.calls[0].arguments[0], '_ga');
			assert.strictEqual(mockRes.clearCookie.mock.calls[1].arguments[0], '_ga_other');
			assert.strictEqual(mockRes.redirect.mock.callCount(), 1);
			assert.strictEqual(mockRes.redirect.mock.calls[0].arguments[0], '/cookies');
		});
		it('should add session data for cookies', () => {
			const mockReq = { body: { acceptCookies: 'yes' }, session: {} };
			const mockRes = {
				cookie: mock.fn(),
				redirect: mock.fn()
			};
			const cookiesSaveController = buildCookiesSaveController({ secureSession: false });
			cookiesSaveController(mockReq, mockRes);
			assert.strictEqual(mockReq.session.cookies.settings.preferenceSet, true);
		});
	});
});
