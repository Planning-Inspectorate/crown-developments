import { Router as createRouter } from 'express';
import { createRoutes as createCreateACaseRoutes } from './create-a-case/index.js';
import { asyncHandler } from '@pins/crowndev-lib/util/async-handler.js';
import { buildListCases } from './list/controller.js';
import { createRoutes as createCaseRoutes } from './view/index.js';

/**
 * @param {Object} opts
 * @param {import('pino').BaseLogger} opts.logger
 * @param {import('@prisma/client').PrismaClient} opts.db
 * @param {import('../../config-types.js').Config} config
 * @param {function(session): SharePointDrive} opts.getSharePointDrive
 * @param {import('@pins/crowndev-lib/graph/types.js').InitEntraClient} opts.getEntraClient
 * @param {import('@pins/crowndev-lib/govnotify/gov-notify-client').GovNotifyClient|null} getGovNotify
 * @returns {import('express').Router}
 */
export function createRoutes({ db, logger, config, getSharePointDrive, getEntraClient, govNotifyClient }) {
	const router = createRouter({ mergeParams: true });
	const createACaseRoutes = createCreateACaseRoutes({ db, logger, config, getSharePointDrive, govNotifyClient });
	const listCases = buildListCases({ db, logger });
	const caseRoutes = createCaseRoutes({ db, logger, config, getEntraClient, getSharePointDrive });

	router.get('/', asyncHandler(listCases));
	// must be before the case routes because the URLs overlap
	router.use('/create-a-case', createACaseRoutes);
	router.use('/:id', caseRoutes);

	return router;
}
