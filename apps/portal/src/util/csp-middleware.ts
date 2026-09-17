import type { HelmetCspDirectives } from '@planning-inspectorate/core/middleware';

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
	connectSrc: ['https://*.google-analytics.com', 'https://*.analytics.google.com', 'https://*.googletagmanager.com'],
	imgSrc: ['https://www.googletagmanager.com']
};

export const cspDirectives: HelmetCspDirectives = {
	scriptSrc: [
		"'self'",
		...googleAnalytics.scriptSrc,
		(req, res) => {
			return `'nonce-${res.locals?.cspNonce as string}'`;
		}
	],
	defaultSrc: ["'self'"],
	connectSrc: ["'self'", ...googleAnalytics.connectSrc],
	fontSrc: ["'self'"],
	imgSrc: ["'self'", ...googleAnalytics.imgSrc],
	styleSrc: ["'self'"]
};
