import type { S62APortalService } from '#service';
import {
	APPLICATION_PUBLISH_STATUS,
	fetchPublishedS62aApplication,
	getApplicationStatus
} from '@pins/crowndev-lib/util/applications.ts';
import { getStringParam } from '@pins/crowndev-lib/util/params.ts';
import { notFoundHandler } from '@planning-inspectorate/core/middleware';
import type { RequestHandler } from 'express';
import type { S62aCaseWithRelations } from '../view/view-model.ts';

/**
 * Middleware to check if the application is expired and serve 404 if so.
 */
export function checkIfExpiredMiddleware(
	service: S62APortalService,
	fetchPublishedApplicationFn = fetchPublishedS62aApplication
): RequestHandler {
	return checkStatusMiddleware([APPLICATION_PUBLISH_STATUS.EXPIRED], service, fetchPublishedApplicationFn);
}

function checkStatusMiddleware(
	blockedStatuses: Array<(typeof APPLICATION_PUBLISH_STATUS)[keyof typeof APPLICATION_PUBLISH_STATUS]>,
	service: S62APortalService,
	fetchPublishedApplicationFn = fetchPublishedS62aApplication
): RequestHandler {
	const { db } = service;
	return async (req, res, next) => {
		const id = getStringParam(req.params, 'applicationId');

		const s62aCase = (await fetchPublishedApplicationFn({
			db,
			id,
			args: {
				include: {
					S62aDates: true
				}
			}
		})) as S62aCaseWithRelations;

		if (!s62aCase) {
			return notFoundHandler(req, res);
		}

		const status = getApplicationStatus(s62aCase?.S62aDates?.withdrawnDate);

		if (blockedStatuses.includes(status)) {
			return notFoundHandler(req, res);
		}

		return next();
	};
}
