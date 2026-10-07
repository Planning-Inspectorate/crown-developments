import { buildRouter } from './router.js';
import { configureNunjucks } from './nunjucks.js';
import { addLocalsConfiguration } from '#util/config-middleware.js';
import { cleanEmptyQueryParams, trimEmptyQuery } from '@pins/crowndev-lib/middleware/query-middleware.js';
import { createBaseApp } from '@planning-inspectorate/core/app';
import { loadManifest } from '@pins/crowndev-lib/util/manifest.ts';

/**
 * @param {import('#service').ManageService} service
 * @returns {Express}
 */
export async function getApp(service) {
	const router = buildRouter(service);
	const manifest = await loadManifest(service.staticDir, service.logger);
	return createBaseApp({
		service,
		router,
		configureNunjucks,
		multiPartFormRoutes: [
			// Multer multipart/form-data needs to be handled before Lusca CSRF check
			// upload-documents is the POST API the file-upload component in our journeys, which uses Multer
			/\/upload-documents\/?$/
		],
		csrfRouteBypass: [
			// Callback from notify doesn't contain a csrf, as it is a 3rd party api
			'/notify/callback'
		],
		middlewares: [
			// middleware to clean empty query params and trim empty query values
			cleanEmptyQueryParams,
			trimEmptyQuery,
			(req, res, next) => {
				// S62A header variable, to trigger header on S62A pages
				res.locals.isS62A = req.path.includes('/s62a/');
				next();
			},
			addLocalsConfiguration(service, manifest)
		]
	});
}
