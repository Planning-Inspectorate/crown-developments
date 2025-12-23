import { fetchPublishedApplication as defaultFetchPublishedApplication } from '#util/applications.js';
import { notFoundHandler as realNotFoundHandler } from '@pins/crowndev-lib/middleware/errors.js';

export function checkIfExpiredMiddleware(service) {
	const { db, fetchPublishedApplication = defaultFetchPublishedApplication } = service;
	return async (req, res, next) => {
		const id = req.params.applicationId;
		if (!id) {
			throw new Error('id param required');
		}
		const crownDevelopment = await fetchPublishedApplication({
			db,
			id,
			args: {}
		});
		const withdrawnDateIsExpired = !!crownDevelopment?.withdrawnDateIsExpired;
		if (!crownDevelopment || withdrawnDateIsExpired) {
			return realNotFoundHandler(req, res);
		} else {
			return next();
		}
	};
}
