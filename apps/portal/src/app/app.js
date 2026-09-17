import manifest from '../.static/manifest.json' with { type: 'json' };
import { buildRouter } from './router.js';
import { configureNunjucks } from './nunjucks.js';
import { addLocalsConfiguration } from '#util/config-middleware.js';
import { cspDirectives } from '#util/csp-middleware.ts';
import { buildAnalyticsCookiesMiddleware } from '#util/cookies.js';
import { cleanEmptyQueryParams, trimEmptyQuery } from '@pins/crowndev-lib/middleware/query-middleware.js';
import { createBaseApp } from '@planning-inspectorate/core/app';

/**
 * @param {import('#service').PortalService} service
 * @returns {Express}
 */
export function getApp(service) {
	const router = buildRouter(service);

	return createBaseApp({
		service,
		router,
		configureNunjucks,
		cspDirectives,
		multiPartFormRoutes: [
			// Multer multipart/form-data needs to be handled before Lusca CSRF check
			// upload-documents is the POST API the file-upload component in our journeys, which uses Multer
			/\/upload-documents\/?$/
		],
		middlewares: [
			// middleware to clean empty query params and trim empty query values
			cleanEmptyQueryParams,
			trimEmptyQuery,
			addLocalsConfiguration(service),
			buildAnalyticsCookiesMiddleware(service),
			(req, res, next) => {
				res.locals.styleCss = manifest['style.css'];
				next();
			}
		]
	});
}
