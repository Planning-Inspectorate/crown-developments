/** @type {import('express').RequestHandler} */
export function handleHeadHealthCheck(_, response) {
	// no-op - HEAD mustn't return a body
	response.sendStatus(200);
}

/**
 * @param {import('pino').Logger} logger
 * @param {{gitSha?: string}} config
 * @param {import('@prisma/client').PrismaClient} dbClient
 * @returns {import('express').RequestHandler}
 */
export function buildHandleHeathCheck(logger, config, dbClient) {
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
