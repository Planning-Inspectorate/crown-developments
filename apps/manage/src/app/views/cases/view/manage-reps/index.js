import { Router as createRouter } from 'express';
import { asyncHandler } from '@pins/crowndev-lib/util/async-handler.js';
import { buildListReps } from './list/controller.js';
import { addRep } from './add/controller.js';
import { buildGetJourneyMiddleware, viewRepresentation } from './view/controller.js';
import { reviewRep } from './review/controller.js';

/**
 * @param {Object} opts
 * @param {import('@prisma/client').PrismaClient} opts.db
 * @param {import('pino').BaseLogger} opts.logger
 * @returns {import('express').Router}
 */
export function createRoutes({ db, logger }) {
	const router = createRouter({ mergeParams: true });
	const list = buildListReps({ db });

	const getJourney = asyncHandler(buildGetJourneyMiddleware({ db, logger }));

	router.get('/', asyncHandler(list));
	router.get('/add', addRep);
	router.get('/:representationRef/view', getJourney, asyncHandler(viewRepresentation));
	router.get('/:representationRef/review', reviewRep);

	return router;
}
