import { Router as createRouter } from 'express';
import { applicationInfoRoutes } from './application-info/index.js';
import { buildApplicationDocumentsPage } from './documents/controller.js';
import { viewHaveYourSayPage } from './have-your-say/controller.js';
import { asyncHandler } from '@pins/crowndev-lib/util/async-handler.js';
import { applicationListRoutes } from './list/index.js';

/**
 * @param {Object} opts
 * @param {import('pino').Logger} opts.logger
 * @param {import('@prisma/client').PrismaClient} opts.db
 * @param {import('../../../config-types.js').Config} opts.config
 * @param {import('@pins/crowndev-sharepoint/src/sharepoint/drives/drives.js').SharePointDrive} opts.sharePointDrive
 * @returns {import('express').Router}
 */
export function createRoutes(opts) {
	const router = createRouter({ mergeParams: true });
	const applicationDocumentsPage = buildApplicationDocumentsPage(opts);

	router.use('/', applicationListRoutes(opts));
	router.use('/application-information/:applicationId', applicationInfoRoutes(opts));

	// placeholders for documents and have-your-say routes
	router.get('/application-information/:applicationId/documents', asyncHandler(applicationDocumentsPage));
	router.get('/application-information/:applicationId/have-your-say', viewHaveYourSayPage);

	return router;
}
