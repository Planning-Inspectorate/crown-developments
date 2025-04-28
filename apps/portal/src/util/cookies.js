import cookie from 'cookie';
import { addSessionData, clearSessionData, readSessionData } from '@pins/crowndev-lib/util/session.js';

export const COOKIE_NAME_ANALYTICS_ENABLED = 'CrownDevAnalyticsEnabled';
const ONE_YEAR_MS = 365 * 24 * 60 * 60 * 1000;

/**
 * @param {import('#service').PortalService} service
 * @returns {import('express').Handler}
 */
export function buildAnalyticsCookiesMiddleware({ appHostname }) {
	return (req, res, next) => {
		// handle POST from any page, via the cookie banner
		if (req.method === 'POST' && req.body?.cookiePreference) {
			const enableAnalyticsCookies = req.body.cookiePreference === 'accept';
			setAnalyticsCookiesPreference(req, res, enableAnalyticsCookies, req.secure, appHostname);
			setCookieSettingSession(req, { preferenceSetViaBanner: true });
			res.redirect(req.url);
			return;
		}
		const cookies = parseCookies(req);
		res.locals.analyticsCookiesPreferenceSetViaBanner = readCookieSettingSession(req, 'preferenceSetViaBanner');
		clearCookieSettingSession(req, 'preferenceSetViaBanner');
		res.locals.analyticsCookiesPreferenceSet = cookies && Object.hasOwn(cookies, COOKIE_NAME_ANALYTICS_ENABLED);
		res.locals.analyticsCookiesEnabled = cookies && cookies[COOKIE_NAME_ANALYTICS_ENABLED] === 'true';

		next();
	};
}

/**
 * Sets the analytics cookies preference, and clears any existing analytics cookies if the user has opted out.
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {boolean} enabled
 * @param {boolean} secureSession
 * @param {string} domain
 */
export function setAnalyticsCookiesPreference(req, res, enabled, secureSession, domain) {
	res.cookie(COOKIE_NAME_ANALYTICS_ENABLED, enabled ? 'true' : 'false', {
		encode: String,
		maxAge: ONE_YEAR_MS,
		secure: secureSession
	});

	if (!enabled) {
		removeAnalyticsCookies(req, res, domain);
	}
}

/**
 * Clears all analytics cookies on the response.
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {string} domain
 */
export function removeAnalyticsCookies(req, res, domain) {
	const cookies = parseCookies(req);
	const gaCookieNames = Object.keys(cookies).filter((cookieName) => cookieName.startsWith('_ga'));
	for (const cookieName of gaCookieNames) {
		res.clearCookie(cookieName);
		// GA cookies are set on ".domain"
		res.clearCookie(cookieName, { domain: '.' + domain, secure: false });
		res.clearCookie(cookieName, { domain: '.' + domain, secure: true });
	}
}

/**
 * @param {import('express').Request} req
 * @returns {Record<string, string | undefined>}
 */
export function parseCookies(req) {
	const cookieHeader = req.headers?.cookie;
	if (!cookieHeader) {
		return {};
	}
	return cookie.parse(cookieHeader);
}

/**
 * @param {import('express').Request | {session?: Object<string, any>}} req
 * @param {Object<string, any>} data
 */
export function setCookieSettingSession(req, data) {
	addSessionData(req, 'settings', data, 'cookies');
}

/**
 * @param {import('express').Request | {session?: Object<string, any>}} req
 * @param {string} field
 */
export function readCookieSettingSession(req, field) {
	return readSessionData(req, 'settings', field, false, 'cookies');
}

/**
 * @param {import('express').Request | {session?: Object<string, any>}} req
 * @param {string} field
 */
export function clearCookieSettingSession(req, field) {
	clearSessionData(req, 'settings', field, 'cookies');
}
