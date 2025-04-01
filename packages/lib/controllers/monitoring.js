import { Router as createRouter } from 'express';
import { asyncHandler } from '../util/async-handler.js';
/**
 * @param {Object} params
 * @param {import('pino').BaseLogger} params.logger
 * @param {string} [params.gitSha]
 * @param {import('@prisma/client').PrismaClient} params.dbClient
 * @returns {import('express').Router}
 */
export function createMonitoringRoutes({ gitSha, dbClient, logger }) {
	const router = createRouter();
	const handleHealthCheck = buildHandleHeathCheck(logger, gitSha, dbClient);

	router.use((req, res, next) => {
		// don't cache monitoring responses
		res.set('Cache-Control', 'no-store');
		next();
	});

	router.head('/', asyncHandler(handleHeadHealthCheck));
	router.get('/health', asyncHandler(handleHealthCheck));

	return router;
}

/** @type {import('express').RequestHandler} */
export function handleHeadHealthCheck(_, response) {
	// no-op - HEAD mustn't return a body
	response.sendStatus(200);
}

/**
 * @param {import('pino').BaseLogger} logger
 * @param {string} [gitSha]
 * @param {import('@prisma/client').PrismaClient} dbClient
 * @returns {import('express').RequestHandler}
 */
export function buildHandleHeathCheck(logger, gitSha, dbClient) {
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
			commit: gitSha,
			database: database ? 'OK' : 'ERROR' // should this be a different response code?
		});
	};
}
