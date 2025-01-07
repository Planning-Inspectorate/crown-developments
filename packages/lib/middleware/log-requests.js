/**
 * Log all requests to console
 *
 * @param {import('pino').Logger}logger
 * @returns {import('express').RequestHandler}
 */
export function buildLogRequestsMiddleware(logger) {
	return (_, res, next) => {
		const { req, statusCode } = res;
		logger.debug(`${req.method} ${statusCode} ${req.originalUrl.toString()}`);
		next();
	};
}
