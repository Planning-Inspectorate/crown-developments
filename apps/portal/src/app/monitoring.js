import { Router as createRouter } from 'express';
import { loadConfig } from './config.js';
import { getDatabaseClient } from '#util/database.js';
import { getLogger } from '#util/logger.js';

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

/** @type {import('express').RequestHandler} */
function handleHeadHealthCheck(_, response) {
	// no-op - HEAD mustn't return a body
	response.sendStatus(200);
}

/**
 * @param {import('pino').Logger} logger
 * @param {import('./config-types').Config} config
 * @param {import('@prisma/client').PrismaClient} dbClient
 * @returns {import('express').RequestHandler}
 */
function buildHandleHeathCheck(logger, config, dbClient) {
	return async (_, response) => {
		let database = false;
		try {
			await dbClient.$queryRaw`SELECT 1`;
			database = true;
		} catch (e) {
			logger.warn(e, 'database connection error');
		}

		response.status(200).send({
			status: 'OK',
			uptime: process.uptime(),
			commit: config.gitSha,
			database: database ? 'OK' : 'ERROR' // should this be a different response code?
		});
	};
}
