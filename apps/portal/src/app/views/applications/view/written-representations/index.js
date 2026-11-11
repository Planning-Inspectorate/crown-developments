import { Router as createRouter } from 'express';
import { buildWrittenRepresentationsListPage } from './controller.js';
import { asyncHandler } from '@planning-inspectorate/core/util';
import { buildCrownWrittenRepresentationsReadMorePage } from './read-more/controller.ts';
import { buildDocumentView, isPublishedRepresentationDocument } from '../../../util/documents-util.js';
import { buildCachingDynamicContentMiddleware } from '../../../util/caching-middleware.js';
import { representationAttachmentsFolderPath } from '@pins/crowndev-lib/util/sharepoint-path.js';
import { getStringParam } from '@pins/crowndev-lib/util/params.ts';

/**
 * @param {import('#service').PortalService} service
 * @returns {import('express').Router}
 */
export function createWrittenRepresentationsRoutes(service) {
	const router = createRouter({ mergeParams: true });
	const viewWrittenRepresentationsListPage = buildWrittenRepresentationsListPage(service);
	const viewWrittenRepresentationsReadMorePage = buildCrownWrittenRepresentationsReadMorePage(service);
	const viewWrittenRepresentationsDocumentPage = buildDocumentView(service, {
		getAllowedFolderPath: (reference, req) =>
			representationAttachmentsFolderPath(reference, getStringParam(req.params, 'representationReference')),
		isDocumentAllowed: ({ applicationId, documentId, req }) =>
			isPublishedRepresentationDocument(service.db, {
				applicationId,
				representationReference: getStringParam(req.params, 'representationReference'),
				documentId
			})
	});
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
