import type { S62APortalService } from '#service';
import {
	clearCookieSettingSession,
	readCookieSettingSession,
	setAnalyticsCookiesPreference,
	setCookieSettingSession
} from '@pins/crowndev-lib/util/cookies.ts';
import type { Request, Response } from 'express';
import type { ParamsDictionary } from 'express-serve-static-core';

/**
 * Loads the cookie page
 */
export function buildCookiesPage() {
	return (req: Request, res: Response) => {
		const cookiePreferenceSet = readCookieSettingSession(req, 'preferenceSet');
		clearCookieSettingSession(req, 'preferenceSet');
		res.render('views/static/cookies/view.njk', {
			pageTitle: 'Cookies',
			cookiePreferenceSet
		});
	};
}

/**
 * Builds the controller for saving a user's cookie selection.
 */
export function buildCookiesSaveController(service: S62APortalService) {
	const { appHostname, secureSession, cookieName } = service;
	return (req: Request<ParamsDictionary, unknown, { acceptCookies: string }>, res: Response) => {
		if (typeof req.body.acceptCookies !== 'string') {
			res.redirect('/cookies');
			return;
		}

		// set the cookie based on the radio value
		const enableAnalyticsCookies = req.body.acceptCookies === 'yes';
		setAnalyticsCookiesPreference(req, res, enableAnalyticsCookies, secureSession, appHostname, cookieName);
		setCookieSettingSession(req, { preferenceSet: true });

		res.redirect('/cookies');
	};
}
