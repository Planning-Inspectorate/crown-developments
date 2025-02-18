import { Router as createRouter } from 'express';
import { applicationInfoRoutes } from './application-info/index.js';
import { viewDocumentsPage } from './documents/controller.js';
import { viewHaveYourSayPage } from './have-your-say/controller.js';
import { applicationListRoutes } from './list/index.js';

/**
 * @param {Object} opts
 * @param {import('pino').Logger} opts.logger
 * @param {import('@prisma/client').PrismaClient} opts.db
 * @param {import('../../../config-types.js').Config} opts.config
 * @returns {import('express').Router}
 */
export function createRoutes(opts) {
	const router = createRouter({ mergeParams: true });

	router.use('/', applicationListRoutes(opts));
	router.use('/application-information/:applicationId', applicationInfoRoutes(opts));

	// placeholders for documents and have-your-say routes
	router.get('/application-information/:applicationId/documents', viewDocumentsPage);
	router.get('/application-information/:applicationId/have-your-say', viewHaveYourSayPage);

	return router;
}
