import { Router as createRouter } from 'express';
import { buildApplicationDocumentsPage, buildDocumentView } from './documents/controller.js';
import { asyncHandler } from '@pins/crowndev-lib/util/async-handler.js';
import { buildApplicationInformationPage } from './application-info/controller.js';
import { createHaveYourSayRoutes } from './have-your-say/index.js';

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
	const applicationInfoController = buildApplicationInformationPage(opts);
	const applicationDocumentsPage = buildApplicationDocumentsPage(opts);
	const viewDocumentPage = buildDocumentView(opts);
	const haveYourSayPageRoutes = createHaveYourSayRoutes(opts);

	router.get('/', asyncHandler(applicationInfoController));
	router.get('/documents', asyncHandler(applicationDocumentsPage));
	router.get('/documents/:documentId', asyncHandler(viewDocumentPage));
	router.use('/have-your-say', haveYourSayPageRoutes);

	return router;
}
