import { Router as createRouter } from 'express';
import { buildWrittenRepresentationsListPage } from './controller.js';
import { asyncHandler } from '@pins/crowndev-lib/util/async-handler.js';
import { buildWrittenRepresentationsReadMorePage } from './read-more/controller.js';
import { buildDocumentView } from '../../../util/documents-util.js';

/**
 * @param {import('#service').PortalService} service
 * @returns {import('express').Router}
 */
export function createWrittenRepresentationsRoutes(service) {
	const router = createRouter({ mergeParams: true });
	const viewWrittenRepresentationsListPage = buildWrittenRepresentationsListPage(service);
	const viewWrittenRepresentationsReadMorePage = buildWrittenRepresentationsReadMorePage(service);
	const viewWrittenRepresentationsDocumentPage = buildDocumentView(service);

	router.get('/', asyncHandler(viewWrittenRepresentationsListPage));
	router.get('/:representationReference', asyncHandler(viewWrittenRepresentationsReadMorePage));
	router.get('/:representationReference/:documentId', asyncHandler(viewWrittenRepresentationsDocumentPage));

	return router;
}
