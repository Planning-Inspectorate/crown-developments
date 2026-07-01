import { fetchPublishedApplication, getApplicationStatus, APPLICATION_PUBLISH_STATUS } from '#util/applications.ts';
import { notFoundHandler } from '@pins/crowndev-lib/middleware/errors.ts';
import type { PortalService } from '#service';
import type { RequestHandler } from 'express';
import { getStringParam } from '@pins/crowndev-lib/util/params.ts';

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
		const id = getStringParam(req.params, 'applicationId');

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
 * Middleware to check if the application is expired and serve 404 if so.
 */
export function checkIfExpiredMiddleware(
	service: PortalService,
	fetchPublishedApplicationFn = fetchPublishedApplication
): RequestHandler {
	return checkStatusMiddleware([APPLICATION_PUBLISH_STATUS.EXPIRED], service, fetchPublishedApplicationFn);
}

/**
 * Middleware to check if the application is withdrawn OR expired and serve 404 if so.
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
