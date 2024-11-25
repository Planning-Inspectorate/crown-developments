/**
 * Log all requests to console
 *
 * @param {() => import('pino').Logger} getLogger
 * @returns {import('express').RequestHandler}
 */
export function buildLogRequestsMiddleware(getLogger) {
    const logger = getLogger();
    return (_, res, next) => {
        const { req, statusCode } = res;
        logger.debug(`${req.method} ${statusCode} ${req.originalUrl.toString()}`);
        next();
    };
}