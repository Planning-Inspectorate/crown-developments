import {
	type HelmetCspDirectives,
	initContentSecurityPolicyMiddlewares as initSharedContentSecurityPolicyMiddlewares
} from '@pins/crowndev-lib/middleware/csp-middleware.ts';
import type { Handler } from 'express';

/**
 * Initialises the Content Security Policy (CSP) middlewares for the application.
 */
export function initContentSecurityPolicyMiddlewares(): Handler[] {
	const googleAnalytics = {
		scriptSrc: [
			'https://*.googletagmanager.com',
			'https://*.google-analytics.com',
			// inline script for adding tags in header - different hashes for different environments & opt-in combinations
			// dev
			"'sha256-rt766Z9cVh/56VSo8pMCGzT/jZ3Tp4KWasOOuwTShU8='",
			"'sha256-kJ4ZfcxmT0ryTMbhntpK/CO7VVKshOEurw8Mdnrw9xk='",
			// test
			"'sha256-HEzZLueZPyuXv0C9CeZKCmNP761M5qyHkFzsWEozrGg='",
			"'sha256-Gq1KwVrPk2K3+tV+kJuags6K5c0vMG+eSmZZLD5DlAA='",
			// prod
			"'sha256-7zbeFC0WLiMB91PUOjhl4gr+nVFhMvuL8499Uj28yhk='",
			"'sha256-UN0YC/M1Zsw697Rinjvc9+EQSGi5Rp94tCe93kO195E='"
		],
		connectSrc: ['https://*.google-analytics.com', 'https://*.analytics.google.com', 'https://*.googletagmanager.com']
	};

	const directives: HelmetCspDirectives = {
		scriptSrc: [
			"'self'",
			...googleAnalytics.scriptSrc,
			(req, res) => {
				return `'nonce-${res.locals?.cspNonce}'`;
			}
		],
		defaultSrc: ["'self'"],
		connectSrc: ["'self'", ...googleAnalytics.connectSrc],
		fontSrc: ["'self'"],
		imgSrc: ["'self'"],
		styleSrc: ["'self'"]
	};

	return initSharedContentSecurityPolicyMiddlewares(directives);
}
