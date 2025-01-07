import bodyParser from 'body-parser';
import crypto from 'node:crypto';
import express from 'express';
import helmet from 'helmet';
import { buildRouter } from './router.js';
import { configureNunjucks } from './nunjucks.js';
import { buildLogRequestsMiddleware } from '@pins/crowndev-lib/middleware/log-requests.js';
import { buildDefaultErrorHandlerMiddleware, notFoundHandler } from '@pins/crowndev-lib/middleware/errors.js';
import { getSessionMiddleware } from '@pins/crowndev-lib/util/session.js';
import { addLocalsConfiguration } from '#util/config-middleware.js';
import { getRedis } from '@pins/crowndev-lib/redis/index.js';
import { getDatabaseClient } from '@pins/crowndev-database';

/**
 * @param {import('./config-types.js').Config} config
 * @param {import('pino').Logger} logger
 * @returns {Express}
 */
export function getApp(config, logger) {
	const dbClient = getDatabaseClient(config, logger);
	const redis = getRedis(config.session, logger);

	// create an express app, and configure it for our usage
	const app = express();

	const logRequests = buildLogRequestsMiddleware(logger);
	app.use(logRequests);

	// configure body-parser, to populate req.body
	// see https://expressjs.com/en/resources/middleware/body-parser.html
	app.use(bodyParser.urlencoded({ extended: true }));
	app.use(bodyParser.json());

	const sessionMiddleware = getSessionMiddleware({
		redis,
		secure: config.NODE_ENV === 'production',
		secret: config.session.secret
	});
	app.use(sessionMiddleware);

	// Generate the nonce for each request
	app.use((req, res, next) => {
		res.locals.cspNonce = crypto.randomBytes(32).toString('hex');
		next();
	});

	app.use(addLocalsConfiguration);

	// Secure apps by setting various HTTP headers
	app.use(helmet());
	app.use(
		helmet.contentSecurityPolicy({
			directives: {
				// @ts-ignore
				scriptSrc: ["'self'", (req, res) => `'nonce-${res.locals.cspNonce}'`],
				defaultSrc: ["'self'"],
				'font-src': ["'self'"],
				'img-src': ["'self'"],
				'style-src': ["'self'"]
			}
		})
	);

	const nunjucksEnvironment = configureNunjucks();
	// Set the express view engine to nunjucks
	// calls to res.render will use nunjucks
	nunjucksEnvironment.express(app);
	app.set('view engine', 'njk');

	// static files
	app.use(express.static(config.staticDir));

	const router = buildRouter({
		config,
		logger,
		dbClient
	});
	// register the router, which will define any subpaths
	// any paths not defined will return 404 by default
	app.use('/', router);

	app.use(notFoundHandler);

	const defaultErrorHandler = buildDefaultErrorHandlerMiddleware(logger);
	// catch/handle errors last
	app.use(defaultErrorHandler);

	return app;
}
