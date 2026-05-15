import type { PortalService } from '#service';
import { configureNunjucks } from './nunjucks.ts';
import { buildRouter } from './router.ts';
import bodyParser from 'body-parser';
import express, { type Express } from 'express';
import {
	type HelmetCspDirectives,
	initContentSecurityPolicyMiddlewares
} from '@pins/crowndev-lib/middleware/csp-middleware.ts';
import { buildDefaultErrorHandlerMiddleware, notFoundHandler } from '@pins/crowndev-lib/middleware/errors.ts';
import { buildLogRequestsMiddleware } from '@pins/crowndev-lib/middleware/log-requests.ts';
import { initSessionMiddlewareWithCsrf } from '@pins/crowndev-lib/util/session.ts';
import manifest from '../.static/manifest.json' with { type: 'json' };

export function createApp(service: PortalService): Express {
	// create an express app, and configure it for our usage
	const app = express();

	const logRequests = buildLogRequestsMiddleware(service.logger);
	app.use(logRequests);

	// configure body-parser, to populate req.body
	// see https://expressjs.com/en/resources/middleware/body-parser.html
	app.use(bodyParser.urlencoded({ extended: true }));
	app.use(bodyParser.json());

	const sessionMiddleware = initSessionMiddlewareWithCsrf({
		redis: service.redisClient,
		secure: service.secureSession,
		secret: service.sessionSecret
	});
	app.use(sessionMiddleware);

	// content security policy middleware including nonce generation
	app.use(...initContentSecurityPolicyMiddlewares(cspDirectiveDefaults));

	const nunjucksEnvironment = configureNunjucks();
	// Set the express view engine to nunjucks
	// calls to res.render will use nunjucks
	nunjucksEnvironment.express(app);
	app.set('view engine', 'njk');

	// static files
	app.use(express.static(service.staticDir, service.cacheControl));

	// Cache busting for CSS
	app.use((req, res, next) => {
		res.locals.styleCss = manifest['style.css'] ?? 'style.css';
		next();
	});

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

const cspDirectiveDefaults: HelmetCspDirectives = {
	scriptSrc: ["'self'", (req, res) => `'nonce-${res.locals?.cspNonce}'`],
	defaultSrc: ["'self'"],
	connectSrc: ["'self'"],
	fontSrc: ["'self'"],
	imgSrc: ["'self'"],
	styleSrc: ["'self'"]
};
