import { Router as createRouter } from 'express';
import { buildWrittenRepresentationsListPage } from './controller.js';
import { asyncHandler } from '@pins/crowndev-lib/util/async-handler.js';
import { buildWrittenRepresentationsReadMorePage } from './read-more/controller.js';
import { buildDocumentView } from '../../../util/documents-util.js';

/**
 * @param {Object} opts
 * @param {import('@prisma/client').PrismaClient} opts.db
 * @param {import('pino').Logger} opts.logger
 * @param {import('@pins/crowndev-sharepoint/src/sharepoint/drives/drives.js').SharePointDrive} opts.sharePointDrive
 * @returns {import('express').Router}
 */
export function createWrittenRepresentationsRoutes({ db, logger, sharePointDrive }) {
	const router = createRouter({ mergeParams: true });
	const viewWrittenRepresentationsListPage = buildWrittenRepresentationsListPage({ db, logger });
	const viewWrittenRepresentationsReadMorePage = buildWrittenRepresentationsReadMorePage({
		db,
		logger,
		sharePointDrive
	});
	const viewWrittenRepresentationsDocumentPage = buildDocumentView({
		db,
		logger,
		sharePointDrive
	});

	router.get('/', asyncHandler(viewWrittenRepresentationsListPage));
	router.get('/:representationReference', asyncHandler(viewWrittenRepresentationsReadMorePage));
	router.get('/:representationReference/:documentId', asyncHandler(viewWrittenRepresentationsDocumentPage));

	return router;
}
