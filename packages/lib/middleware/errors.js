/**
 * A catch-all error handler to use as express middleware
 *
 * @param {() => import('pino').Logger} getLogger
 * @returns {import('express').ErrorRequestHandler}
 */
export function buildDefaultErrorHandlerMiddleware(getLogger) {
    const logger = getLogger();
    return (error, req, res, next) => {

        const message = error.message || 'unknown error'
        logger.error(error, message);

        if (res.headersSent) {
            next(error);
            return;
        }

        const code = error.statusCode || 500;
        res.status(code);
        res.render(`views/layouts/error`, {
            pageTitle: 'Sorry, there was an error',
            messages: [
                message,
                'Try again later'
            ]
        });
    };
}

/**
 * A catch-all handler to serve a 404 page
 *
 * @type {import('express').RequestHandler}
 */
export function notFoundHandler(req, res) {
    res.status(404);
    res.render(`views/layouts/error`, {
        pageTitle: 'Page not found',
        messages: [
            'If you typed the web address, check it is correct.',
            'If you pasted the web address, check you copied the entire address.'
        ]
    });
}