import { Router as createRouter } from 'express';
import { buildWrittenRepresentationsPage } from './controller.js';
import { asyncHandler } from '@pins/crowndev-lib/util/async-handler.js';

/**
 * @param {Object} opts
 * @param {import('@prisma/client').PrismaClient} opts.db
 * @returns {import('express').Router}
 */
export function createWrittenRepresentationsRoutes({ db }) {
	const router = createRouter({ mergeParams: true });
	const viewWrittenRepresentationsPage = buildWrittenRepresentationsPage({ db });

	router.get('/', asyncHandler(viewWrittenRepresentationsPage));

	return router;
}
