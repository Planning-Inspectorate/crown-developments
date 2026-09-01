import { asyncHandler } from '@pins/crowndev-lib/util/async-handler.ts';
import { Router as createRouter } from 'express';
import { buildCachingDynamicContentMiddleware } from '../../../util/caching-middleware.js';
import { buildDocumentView } from '../../../util/documents-util.js';
import { buildWrittenRepresentationsListPage } from './controller.js';
import { buildWrittenRepresentationsReadMorePage } from './read-more/controller.js';

/**
 * @param {import('#service').PortalService} service
 * @returns {import('express').Router}
 */
export function createWrittenRepresentationsRoutes(service) {
	const router = createRouter({ mergeParams: true });
	const viewWrittenRepresentationsListPage = buildWrittenRepresentationsListPage(service);
	const viewWrittenRepresentationsReadMorePage = buildWrittenRepresentationsReadMorePage(service);
	const viewWrittenRepresentationsDocumentPage = buildDocumentView(service);
	const cachingMiddleware = buildCachingDynamicContentMiddleware(service);

	router.get('/', asyncHandler(viewWrittenRepresentationsListPage));
	router.get('/:representationReference', cachingMiddleware, asyncHandler(viewWrittenRepresentationsReadMorePage));
	router.get(
		'/:representationReference/:documentId',
		cachingMiddleware,
		asyncHandler(viewWrittenRepresentationsDocumentPage)
	);

	return router;
}
