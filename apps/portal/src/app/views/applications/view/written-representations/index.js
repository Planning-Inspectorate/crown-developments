import { Router as createRouter } from 'express';
import { buildWrittenRepresentationsListPage } from './controller.js';
import { asyncHandler } from '@pins/crowndev-lib/util/async-handler.js';
import { buildWrittenRepresentationsReadMorePage } from './read-more/controller.js';

/**
 * @param {Object} opts
 * @param {import('@prisma/client').PrismaClient} opts.db
 * @param {import('pino').Logger} opts.logger
 * @returns {import('express').Router}
 */
export function createWrittenRepresentationsRoutes({ db, logger }) {
	const router = createRouter({ mergeParams: true });
	const viewWrittenRepresentationsListPage = buildWrittenRepresentationsListPage({ db, logger });
	const viewWrittenRepresentationsReadMorePage = buildWrittenRepresentationsReadMorePage({ db, logger });

	router.get('/', asyncHandler(viewWrittenRepresentationsListPage));
	router.get('/:representationReference', asyncHandler(viewWrittenRepresentationsReadMorePage));

	return router;
}
