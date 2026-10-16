import type { S62APortalService } from '#service';
import { notFoundHandler } from '@planning-inspectorate/core/middleware';
import express, { type ErrorRequestHandler } from 'express';
import session from 'express-session';
import { configureNunjucks } from '../../../../nunjucks.ts';
import { createRoutes } from './index.ts';

/**
 * A minimal app around the Have your say router for route tests: body parsing, sessions and
 * nunjucks as in createBaseApp, without CSRF, CSP or logging.
 */
export function createHaveYourSayTestApp(service: S62APortalService) {
	const app = express();
	app.use(express.urlencoded({ extended: true }));
	// longer than the journey's 24 hours, so tests can check the journey limit while the cookie is still valid
	app.use(
		session({ secret: 'test', resave: false, saveUninitialized: false, cookie: { maxAge: 72 * 60 * 60 * 1000 } })
	);
	app.use((req, res, next) => {
		res.locals.config = {
			headerTitle: 'Find a local planning application made to the Planning Inspectorate',
			footerLinks: [],
			primaryNavigationLinks: [],
			manifest: { styleFile: 'style.css', govukJsFile: 'govuk-frontend.min.js' }
		};
		next();
	});
	configureNunjucks().express(app);
	app.set('view engine', 'njk');
	app.use('/applications/:applicationId/have-your-say', createRoutes(service));
	app.use(notFoundHandler);
	const errorHandler: ErrorRequestHandler = (err, req, res, next) => {
		next(err);
	};
	app.use(errorHandler);
	return app;
}
