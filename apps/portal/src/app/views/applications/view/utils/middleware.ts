import { fetchPublishedApplication, getApplicationStatus, APPLICATION_PUBLISH_STATUS } from '#util/applications.ts';
import { notFoundHandler } from '@pins/crowndev-lib/middleware/errors.js';
import type { PortalService } from '#service';
import type { RequestHandler } from 'express';

/**
 * Creates middleware that returns not-found if the application's status matches any of the given blocked statuses.
 */
function checkStatusMiddleware(
	blockedStatuses: Array<(typeof APPLICATION_PUBLISH_STATUS)[keyof typeof APPLICATION_PUBLISH_STATUS]>,
	service: PortalService,
	fetchPublishedApplicationFn = fetchPublishedApplication
): RequestHandler {
	const { db } = service;
	return async (req, res, next) => {
		const id = req.params.applicationId;
		if (!id || typeof id !== 'string') {
			throw new Error('id param required');
		}
		const crownDevelopment = await fetchPublishedApplicationFn({
			db,
			id
		});

		if (!crownDevelopment) {
			return notFoundHandler(req, res);
		}

		const status = getApplicationStatus(crownDevelopment.withdrawnDate);

		if (blockedStatuses.includes(status)) {
			return notFoundHandler(req, res);
		}
		return next();
	};
}

/**
 * Middleware to check if the application is expired and redirect to the expired page if so.
 */
export function checkIfExpiredMiddleware(
	service: PortalService,
	fetchPublishedApplicationFn = fetchPublishedApplication
): RequestHandler {
	return checkStatusMiddleware([APPLICATION_PUBLISH_STATUS.EXPIRED], service, fetchPublishedApplicationFn);
}

/**
 * Middleware to check if the application is withdrawn OR expired and redirect to not found if so.
 * This is used for routes (such as have-your-say) that should be inaccessible for withdrawn applications as well as expired ones.
 */
export function checkIfWithdrawnOrExpiredMiddleware(
	service: PortalService,
	fetchPublishedApplicationFn = fetchPublishedApplication
): RequestHandler {
	return checkStatusMiddleware(
		[APPLICATION_PUBLISH_STATUS.WITHDRAWN, APPLICATION_PUBLISH_STATUS.EXPIRED],
		service,
		fetchPublishedApplicationFn
	);
}
