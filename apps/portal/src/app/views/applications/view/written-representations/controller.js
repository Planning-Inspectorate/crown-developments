import { isValidUuidFormat } from '@pins/crowndev-lib/util/uuid.js';
import { notFoundHandler } from '@pins/crowndev-lib/middleware/errors.js';
import { fetchPublishedApplication } from '#util/applications.js';
import { applicationLinks } from '../view-model.js';

/**
 * Render written representations page
 *
 * @type {import('express').RequestHandler}
 */
export function buildWrittenRepresentationsPage({ db }) {
	return async (req, res) => {
		const id = req.params.applicationId;
		if (!id) {
			throw new Error('id param required');
		}
		if (!isValidUuidFormat(id)) {
			return notFoundHandler(req, res);
		}

		const crownDevelopment = await fetchPublishedApplication({
			id,
			db,
			args: {}
		});

		if (!crownDevelopment) {
			return notFoundHandler(req, res);
		}

		const haveYourSayPeriod = {
			start: new Date(crownDevelopment.representationsPeriodStartDate),
			end: new Date(crownDevelopment.representationsPeriodEndDate)
		};
		const representationsPublishDate = crownDevelopment.representationsPublishDate;

		res.render('views/applications/view/written-representations/view.njk', {
			pageCaption: crownDevelopment.reference,
			pageTitle: 'Written representations',
			links: applicationLinks(id, haveYourSayPeriod, representationsPublishDate),
			currentUrl: req.originalUrl
		});
	};
}
