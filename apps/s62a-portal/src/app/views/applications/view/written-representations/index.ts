import { Router as createRouter } from 'express';
import { buildS62AWrittenRepresentationsPage } from './controller.ts';
import { asyncHandler } from '@planning-inspectorate/core/util';
import { buildS62AWrittenRepresentationsReadMorePage } from './read-more/controller.ts';
import type { S62APortalService } from '#service';

export function createWrittenRepresentationsRoutes(service: S62APortalService) {
	const router = createRouter({ mergeParams: true });
	const viewWrittenRepresentationsListPage = buildS62AWrittenRepresentationsPage(service);
	const viewWrittenRepresentationsReadMorePage = buildS62AWrittenRepresentationsReadMorePage(service);

	router.get('/', asyncHandler(viewWrittenRepresentationsListPage));
	router.get('/:representationReference', asyncHandler(viewWrittenRepresentationsReadMorePage));

	return router;
}
