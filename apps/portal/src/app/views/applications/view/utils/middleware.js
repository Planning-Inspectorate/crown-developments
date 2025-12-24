import { APPLICATION_PUBLISH_STATUS, fetchPublishedApplication } from '#util/applications.js';
import { notFoundHandler } from '@pins/crowndev-lib/middleware/errors.js';

/**
 * Middleware to check if the application is expired and redirect to the expired page if so.
 * @param {import('#service').PortalService} service
 * @param {function} fetchPublishedApplicationFn
 * @returns {import('express').RequestHandler}
 */

export function checkIfExpiredMiddleware(service, fetchPublishedApplicationFn = fetchPublishedApplication) {
	const { db } = service;
	return async (req, res, next) => {
		const id = req.params.applicationId;
		if (!id) {
			throw new Error('id param required');
		}
		const crownDevelopment = await fetchPublishedApplicationFn({
			db,
			id,
			args: {}
		});
		const withdrawnDateIsExpired = crownDevelopment?.applicationStatus === APPLICATION_PUBLISH_STATUS.EXPIRED;
		if (!crownDevelopment || withdrawnDateIsExpired) {
			return notFoundHandler(req, res);
		} else {
			return next();
		}
	};
}
