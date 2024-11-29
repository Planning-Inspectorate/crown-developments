import { Router as createRouter } from 'express';
import { loadConfig } from './config.js';
import { getDatabaseClient } from '#util/database.js';
import { getLogger } from '#util/logger.js';
import { buildHandleHeathCheck, handleHeadHealthCheck } from '@pins/crowndev-lib/controllers/monitoring.js';
import { asyncHandler } from '@pins/crowndev-lib/util/async-handler.js';

/**
 * @returns {import('express').Router}
 */
export function createRoutes() {
	const router = createRouter();
	const config = loadConfig();
	const dbClient = getDatabaseClient();
	const logger = getLogger();
	const handleHealthCheck = buildHandleHeathCheck(logger, config, dbClient);

	router.head('/', asyncHandler(handleHeadHealthCheck));
	router.get('/health', asyncHandler(handleHealthCheck));

	return router;
}
