import { addSessionData, clearSessionData, readSessionData } from '@pins/crowndev-lib/util/session.ts';
import { parseCookie } from 'cookie';

export const COOKIE_NAME_ANALYTICS_ENABLED = 'CrownDevAnalyticsEnabled';
const ONE_YEAR_MS = 365 * 24 * 60 * 60 * 1000;

/** Exact-match cookie names belonging to GA4 and Clarity */
const ANALYTICS_COOKIE_NAMES = ['_ga', '_clck', '_clsk', 'ANONCHK', 'CLID', 'MR', 'MUID', 'SM'];
/** Cookie name prefixes belonging to GA4 and Clarity */
const ANALYTICS_COOKIE_PREFIXES = ['_ga_'];

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
		secure: secureSession,
		sameSite: 'lax',
		httpOnly: true
	});

	if (!enabled) {
		removeAnalyticsCookies(req, res, domain);
	}
}

/**
 * Clears request cookies belonging to GA4 and Clarity at path "/" for the host and configured domain.
 * Cookies on other domains or paths cannot be identified from the request Cookie header.
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {string} domain
 */
export function removeAnalyticsCookies(req, res, domain) {
	const cookies = parseCookies(req);
	const analyticsCookieNames = Object.keys(cookies).filter(
		(cookieName) =>
			ANALYTICS_COOKIE_NAMES.includes(cookieName) ||
			ANALYTICS_COOKIE_PREFIXES.some((prefix) => cookieName.startsWith(prefix))
	);
	for (const cookieName of analyticsCookieNames) {
		res.clearCookie(cookieName, { path: '/' });
		// GA cookies are set on ".domain"
		res.clearCookie(cookieName, { domain: domain.startsWith('.') ? domain : '.' + domain, path: '/' });
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
	return parseCookie(cookieHeader);
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
