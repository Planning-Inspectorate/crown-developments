import { Router as createRouter } from 'express';
import { buildS62AWrittenRepresentationsPage } from './controller.ts';
import { buildS62AWrittenRepresentationsReadMorePage } from './read-more/controller.ts';
import { asyncHandler } from '@planning-inspectorate/core/util';
import type { S62APortalService } from '#service';

export function createWrittenRepresentationsRoutes(service: S62APortalService) {
	const router = createRouter({ mergeParams: true });
	const page = buildS62AWrittenRepresentationsPage(service);
	const readMorePage = buildS62AWrittenRepresentationsReadMorePage(service);

	router.get('/', asyncHandler(page));
	router.get('/:representationReference', asyncHandler(readMorePage));

	return router;
}
