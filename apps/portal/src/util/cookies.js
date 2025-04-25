import cookie from 'cookie';

export const COOKIE_NAME_ANALYTICS_ENABLED = 'CrownDevAnalyticsEnabled';

/**
 * @returns {import('express').Handler}
 */
export function buildAnalyticsCookiesEnabledMiddleware() {
	return (req, res, next) => {
		const cookies = parseCookies(req);
		res.locals.analyticsCookiesEnabled = cookies && cookies[COOKIE_NAME_ANALYTICS_ENABLED] === 'true';

		next();
	};
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
