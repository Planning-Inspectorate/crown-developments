import {
	clearCookieSettingSession,
	readCookieSettingSession,
	setAnalyticsCookiesPreference,
	setCookieSettingSession
} from '#util/cookies.js';

/**
 * Builds the Cookie page controller.
 *
 * @returns {import('express').Handler}
 */
export function buildCookiesPage() {
	return (req, res) => {
		const cookiePreferenceSet = readCookieSettingSession(req, 'preferenceSet');
		clearCookieSettingSession(req, 'preferenceSet');
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

		// set the cookie based on the radio value
		const enableAnalyticsCookies = req.body.acceptCookies === 'yes';
		setAnalyticsCookiesPreference(req, res, enableAnalyticsCookies, secureSession);
		setCookieSettingSession(req, { preferenceSet: true });

		res.redirect('/cookies');
	};
}
