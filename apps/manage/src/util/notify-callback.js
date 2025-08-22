/**
 * Notify callback validator
 * @param {import('#service').ManageService} service
 * @returns {import('express').RequestHandler}
 */
export function buildNotifyCallbackTokenValidator(service) {
	return async (req, res, next) => {
		const authHeader = req.headers.authorization;
		const token = authHeader && authHeader.split(' ')[1];
		if (!service.webHookToken) {
			service.logger.warn('webHookToken is not set in Notify callback');
			return res.status(500);
		} else if (!token || token !== service.webHookToken) {
			service.logger.warn('Invalid or missing authorization token in Notify callback');
			return res.status(401).send('Unauthorized access');
		} else {
			return next();
		}
	};
}
