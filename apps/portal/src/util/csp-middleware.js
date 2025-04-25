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
			// inline script for adding tags in header - different hashes for different environments & opt-in combinations
			"'sha256-kZUlxRXsB78xDlmmssxsRw/goI0mNHMGA+JOb4Vc7Bk='",
			"'sha256-ux3yqI3XSSYVCZXNYcqf2e1dcxniq3WkJOZdByR8v6s='",
			"'sha256-zwh8braEOTwthSm3OnEjuXrEZ7S6RqO5WQu3D6W6Lrk='",
			"'sha256-4KgD/fE0rwa4dah1wc8H2Z+Uo4Isys5HlbM9Bicra5M='",
			"'sha256-pgyjUIdr5IgKjsC0E6pRu9pvdb0OnIUmSqUqJvBdkwY='",
			"'sha256-0mrys5pngls7UfE301YCWw/uCHWWFxprkVdAeBnSuIg='"
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
