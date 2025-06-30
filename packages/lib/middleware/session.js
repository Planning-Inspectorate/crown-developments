export function buildResetSessionMiddleware(logger) {
	return (req, res, next) => {
		// keep account info so user isn't logged out
		const savedAccount = req.session.account;
		// regenerate session to generate new req.sessionID
		req.session.regenerate((err) => {
			if (err) {
				logger.error('Session regeneration error:', err);
				next(err);
			} else {
				req.session.account = savedAccount;
				logger.info('User session refreshed');
				next();
			}
		});
	};
}
