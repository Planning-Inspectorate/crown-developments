import bodyParser from 'body-parser';
import crypto from 'node:crypto';
import express from 'express';
import helmet from 'helmet';
import { buildRouter } from './router.js';
import { configureNunjucks } from './nunjucks.js';
import { getLogger } from '../util/logger.js';
import { loadConfig } from './config.js';
import { buildLogRequestsMiddleware } from '@pins/crowndev-lib/middleware/log-requests.js';
import { buildDefaultErrorHandlerMiddleware, notFoundHandler } from '@pins/crowndev-lib/middleware/errors.js';
import { getSessionMiddleware } from '@pins/crowndev-lib/util/session.js';
import { getRedis } from '../util/redis.js';

export function getApp() {
	const config = loadConfig();

	// create an express app, and configure it for our usage
	const app = express();

	const logRequests = buildLogRequestsMiddleware(getLogger);
	app.use(logRequests);

	// configure body-parser, to populate req.body
	// see https://expressjs.com/en/resources/middleware/body-parser.html
	app.use(bodyParser.urlencoded({ extended: true }));
	app.use(bodyParser.json());

	const redis = getRedis();
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

	const router = buildRouter();
	// register the router, which will define any subpaths
	// any paths not defined will return 404 by default
	app.use('/', router);

	app.use(notFoundHandler);

	const defaultErrorHandler = buildDefaultErrorHandlerMiddleware(getLogger);
	// catch/handle errors last
	app.use(defaultErrorHandler);

	return app;
}