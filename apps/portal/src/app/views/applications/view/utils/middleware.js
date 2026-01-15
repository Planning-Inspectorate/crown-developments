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

/**
 * Middleware to check if the application is withdrawn OR expired and redirect to not found if so.
 * This is used for routes (such as have-your-say) that should be inaccessible for withdrawn applications as well as expired ones.
 * @param {import('#service').PortalService} service
 * @param {function} fetchPublishedApplicationFn
 * @returns {import('express').RequestHandler}
 */
export function checkIfWithdrawnOrExpiredMiddleware(service, fetchPublishedApplicationFn = fetchPublishedApplication) {
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
		const isWithdrawn = crownDevelopment?.applicationStatus === APPLICATION_PUBLISH_STATUS.WITHDRAWN;
		const isExpired = crownDevelopment?.applicationStatus === APPLICATION_PUBLISH_STATUS.EXPIRED;
		if (!crownDevelopment || isWithdrawn || isExpired) {
			return notFoundHandler(req, res);
		} else {
			return next();
		}
	};
}
