import type { Request, RequestHandler, Response } from 'express';
import { parseCookie } from 'cookie';
import { addSessionData, clearSessionData, readSessionData } from './session.ts';
import type { ParamsDictionary } from 'express-serve-static-core';
import { isValidRedirectUri } from './uri.ts';

export const DEFAULT_COOKIE_NAME_ANALYTICS_ENABLED = 'CrownDevAnalyticsEnabled';
const ONE_YEAR_MS = 365 * 24 * 60 * 60 * 1000;
const CLARITY_COOKIE_NAMES = ['_clck', '_clsk', 'ANONCHK', 'CLID', 'MR', 'MUID', 'SM'];
const CLARITY_COOKIE_DOMAIN = '.planninginspectorate.gov.uk';

/** Exact-match cookie names belonging to GA4 and Clarity */
const ANALYTICS_COOKIE_NAMES: readonly string[] = ['_ga', ...CLARITY_COOKIE_NAMES];
/** Cookie name prefixes belonging to GA4 and Clarity */
const ANALYTICS_COOKIE_PREFIXES: readonly string[] = ['_ga_'];

export interface AnalyticsCookiesMiddlewareOptions {
	appHostname: string;
	cookieName?: string;
}

export function buildAnalyticsCookiesMiddleware({
	appHostname,
	cookieName = DEFAULT_COOKIE_NAME_ANALYTICS_ENABLED
}: AnalyticsCookiesMiddlewareOptions): RequestHandler<ParamsDictionary, unknown, { cookiePreference: string }> {
	return (req, res, next): void => {
		if (req.method === 'POST' && req.body?.cookiePreference) {
			const enableAnalyticsCookies = req.body.cookiePreference === 'accept';
			setAnalyticsCookiesPreference(req, res, enableAnalyticsCookies, req.secure, appHostname, cookieName);
			setCookieSettingSession(req, { preferenceSetViaBanner: true });
			const url = isValidRedirectUri(req.url) ? req.url : '/';
			res.redirect(url);
			return;
		}

		const cookies = parseCookies(req);
		res.locals.analyticsCookiesPreferenceSetViaBanner = readCookieSettingSession(req, 'preferenceSetViaBanner');
		clearCookieSettingSession(req, 'preferenceSetViaBanner');
		res.locals.analyticsCookiesPreferenceSet = Object.hasOwn(cookies, cookieName);
		res.locals.analyticsCookiesEnabled = cookies[cookieName] === 'true';

		next();
	};
}

export function setAnalyticsCookiesPreference(
	req: Request,
	res: Response,
	enabled: boolean,
	secureSession: boolean,
	domain: string,
	cookieName: string = DEFAULT_COOKIE_NAME_ANALYTICS_ENABLED
): void {
	res.cookie(cookieName, enabled ? 'true' : 'false', {
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

export function removeAnalyticsCookies(req: Request, res: Response, domain: string): void {
	const cookies = parseCookies(req);
	const analyticsCookieNames = Object.keys(cookies).filter(
		(cookieName) =>
			ANALYTICS_COOKIE_NAMES.includes(cookieName) ||
			ANALYTICS_COOKIE_PREFIXES.some((prefix) => cookieName.startsWith(prefix))
	);

	for (const cookieName of analyticsCookieNames) {
		const cookieDomain = domain.startsWith('.') ? domain : '.' + domain;
		res.clearCookie(cookieName, { path: '/' });
		// GA cookies are set on ".domain"
		res.clearCookie(cookieName, { domain: cookieDomain, path: '/' });
		if (
			CLARITY_COOKIE_NAMES.includes(cookieName) &&
			cookieDomain !== CLARITY_COOKIE_DOMAIN &&
			cookieDomain.endsWith(CLARITY_COOKIE_DOMAIN)
		) {
			res.clearCookie(cookieName, { domain: CLARITY_COOKIE_DOMAIN, path: '/' });
		}
	}
}

export function parseCookies(req: Request): Record<string, string | undefined> {
	const cookieHeader = req.headers?.cookie;
	if (!cookieHeader) {
		return {};
	}
	return parseCookie(cookieHeader);
}

export function setCookieSettingSession(req: Request, data: Record<string, unknown>): void {
	addSessionData(req, 'settings', data, 'cookies');
}

export function readCookieSettingSession(req: Request, field: string): unknown {
	return readSessionData(req, 'settings', field, false, 'cookies');
}

export function clearCookieSettingSession(req: Request, field: string): void {
	clearSessionData(req, 'settings', field, 'cookies');
}
