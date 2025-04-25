import { COOKIE_NAME_ANALYTICS_ENABLED, parseCookies } from '#util/cookies.js';
import { addSessionData, clearSessionData, readSessionData } from '@pins/crowndev-lib/util/session.js';

const ONE_YEAR_MS = 365 * 24 * 60 * 60 * 1000; // one year in ms

/**
 * Builds the Cookie page controller.
 *
 * @returns {import('express').Handler}
 */
export function buildCookiesPage() {
	return (req, res) => {
		const cookiePreferenceSet = readSessionData(req, 'settings', 'preferenceSet', false, 'cookies');
		clearSessionData(req, 'settings', 'preferenceSet', 'cookies');
		res.render('views/static/cookies/view.njk', {
			pageTitle: 'Cookies',
			pageHeading: 'Cookies on the Find a Crown Development Application service',
			cookiePreferenceSet
		});
	};
}

/**
 * Builds the Cookie page controller.
 *
 * @param {boolean} secureSession
 * @returns {import('express').Handler}
 */
export function buildCookiesSaveController({ secureSession }) {
	return (req, res) => {
		if (typeof req.body.acceptCookies !== 'string') {
			res.redirect('/cookies');
			return;
		}

		const enableAnalyticsCookies = req.body.acceptCookies === 'yes';

		// set the cookie based on the radio value
		res.cookie(COOKIE_NAME_ANALYTICS_ENABLED, enableAnalyticsCookies ? 'true' : 'false', {
			encode: String,
			maxAge: ONE_YEAR_MS,
			secure: secureSession
		});

		if (!enableAnalyticsCookies) {
			// remove GA4 analytics cookies
			const cookies = parseCookies(req);
			const gaCookieNames = Object.keys(cookies).filter((cookieName) => cookieName.startsWith('_ga'));
			for (const cookieName of gaCookieNames) {
				res.clearCookie(cookieName);
			}
		}
		addSessionData(req, 'settings', { preferenceSet: true }, 'cookies');

		res.redirect('/cookies');
	};
}
