import { Router as createRouter } from 'express';
import { loadConfig } from './config.js';
import { getDatabaseClient } from '#util/database.js';
import { getLogger } from '#util/logger.js';
import { buildHandleHeathCheck, handleHeadHealthCheck } from '@pins/crowndev-lib/controllers/monitoring.js';

/**
 * @returns {import('express').Router}
 */
export function createRoutes() {
	const router = createRouter();
	const config = loadConfig();
	const dbClient = getDatabaseClient();
	const logger = getLogger();
	const handleHealthCheck = buildHandleHeathCheck(logger, config, dbClient);

	router.head('/', handleHeadHealthCheck);
	router.get('/health', handleHealthCheck);

	return router;
}
