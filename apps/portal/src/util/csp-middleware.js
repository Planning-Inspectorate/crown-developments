import helmet from 'helmet';
import crypto from 'node:crypto';

/**
 * @returns {import('express').Handler[]}
 */
export function initContentSecurityPolicyMiddlewares() {
	/** @type {import('express').Handler[]} */
	const middlewares = [];

	// Generate the nonce for each request
	middlewares.push((req, res, next) => {
		res.locals.cspNonce = crypto.randomBytes(32).toString('hex');
		next();
	});

	middlewares.push(helmet());

	const googleAnalytics = {
		scriptSrc: [
			'https://*.googletagmanager.com',
			'https://*.google-analytics.com',
			"'sha256-AVSyafCgCLuztNzr9SyNcq/FZDs8sP2hYwyzVDEDoEU='" // inline script for adding tags in header
		],
		connectSrc: ['https://*.google-analytics.com', 'https://*.analytics.google.com', 'https://*.googletagmanager.com']
	};

	/** @type {import('helmet').ContentSecurityPolicyOptions['directives']} */
	const directives = {
		scriptSrc: ["'self'", ...googleAnalytics.scriptSrc, (req, res) => `'nonce-${res.locals.cspNonce}'`],
		defaultSrc: ["'self'"],
		connectSrc: ["'self'", ...googleAnalytics.connectSrc],
		fontSrc: ["'self'"],
		imgSrc: ["'self'"],
		styleSrc: ["'self'"]
	};

	middlewares.push(
		helmet.contentSecurityPolicy({
			directives
		})
	);

	return middlewares;
}
