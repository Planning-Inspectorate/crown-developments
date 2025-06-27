import { notFoundHandler } from './errors.js';

export function resetSessionMiddleware(logger) {
	return (req, res, next) => {
		req.session.regenerate((err) => {
			if (err) {
				logger.error('Session regeneration error:', err);
				return notFoundHandler(req, res);
			} else {
				//TODO: check how this affects BO users where they have to login...
				logger.info('User session refreshed');
				next();
			}
		});
	};
}
