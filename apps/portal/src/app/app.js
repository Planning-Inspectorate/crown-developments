import bodyParser from 'body-parser';
import express from 'express';
import { buildRouter } from './router.js';
import { configureNunjucks } from './nunjucks.js';
import { buildLogRequestsMiddleware } from '@pins/crowndev-lib/middleware/log-requests.js';
import { buildDefaultErrorHandlerMiddleware, notFoundHandler } from '@pins/crowndev-lib/middleware/errors.js';
import { initSessionMiddleware } from '@pins/crowndev-lib/util/session.js';
import { addLocalsConfiguration } from '#util/config-middleware.js';
import { initContentSecurityPolicyMiddlewares } from '#util/csp-middleware.js';

/**
 * @param {import('#service').PortalService} service
 * @returns {Express}
 */
export function getApp(service) {
	// create an express app, and configure it for our usage
	const app = express();

	const logRequests = buildLogRequestsMiddleware(service.logger);
	app.use(logRequests);

	// configure body-parser, to populate req.body
	// see https://expressjs.com/en/resources/middleware/body-parser.html
	app.use(bodyParser.urlencoded({ extended: true }));
	app.use(bodyParser.json());

	const sessionMiddleware = initSessionMiddleware({
		redis: service.redisClient,
		secure: service.secureSession,
		secret: service.sessionSecret
	});
	app.use(sessionMiddleware);

	app.use(addLocalsConfiguration(service));

	// content security policy middleware including nonce generation
	app.use(...initContentSecurityPolicyMiddlewares());

	const nunjucksEnvironment = configureNunjucks();
	// Set the express view engine to nunjucks
	// calls to res.render will use nunjucks
	nunjucksEnvironment.express(app);
	app.set('view engine', 'njk');

	// static files
	app.use(express.static(service.staticDir, service.cacheControl));

	const router = buildRouter(service);
	// register the router, which will define any subpaths
	// any paths not defined will return 404 by default
	app.use('/', router);

	app.use(notFoundHandler);

	const defaultErrorHandler = buildDefaultErrorHandlerMiddleware(service.logger);
	// catch/handle errors last
	app.use(defaultErrorHandler);

	return app;
}
