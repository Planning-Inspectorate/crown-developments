import type { HelmetCspDirectives } from '@planning-inspectorate/core/middleware';

const googleAnalytics = {
	scriptSrc: ['https://*.googletagmanager.com', 'https://*.google-analytics.com'],
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
