import { Router as createRouter } from 'express';
import { asyncHandler } from '@pins/crowndev-lib/util/async-handler.js';
import { buildListReps } from './list/controller.js';
import { addRep } from './add/controller.js';
import { viewRep } from './view/controller.js';
import { reviewRep } from './review/controller.js';

/**
 * @param {Object} opts
 * @param {import('@prisma/client').PrismaClient} opts.db
 * @returns {import('express').Router}
 */
export function createRoutes({ db }) {
	const router = createRouter({ mergeParams: true });
	const list = buildListReps({ db });

	router.get('/', asyncHandler(list));
	router.get('/add', addRep);
	router.get('/:repId/view', viewRep);
	router.get('/:repId/review', reviewRep);

	return router;
}
