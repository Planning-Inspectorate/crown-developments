import { Router as createRouter } from 'express';
import { buildApplicationDocumentsPage, buildDocumentView } from './documents/controller.js';
import { viewHaveYourSayPage } from './have-your-say/controller.js';
import { asyncHandler } from '@pins/crowndev-lib/util/async-handler.js';
import { buildApplicationInformationPage } from './application-info/controller.js';

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

	router.get('/application-information/:applicationId', asyncHandler(applicationInfoController));
	router.get('/application-information/:applicationId/documents', asyncHandler(applicationDocumentsPage));
	router.get('/application-information/:applicationId/documents/:documentId', asyncHandler(viewDocumentPage));
	router.get('/application-information/:applicationId/have-your-say', viewHaveYourSayPage);

	return router;
}
