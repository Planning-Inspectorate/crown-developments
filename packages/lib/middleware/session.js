import { notFoundHandler } from './errors.js';

export function buildResetSessionMiddleware(logger) {
	return (req, res, next) => {
		// keep account info so user isn't logged out
		const savedAccount = req.session.account;
		req.session.regenerate((err) => {
			if (err) {
				logger.error('Session regeneration error:', err);
				return notFoundHandler(req, res);
			} else {
				req.session.account = savedAccount;
				logger.info('User session refreshed');
				next();
			}
		});
	};
}
