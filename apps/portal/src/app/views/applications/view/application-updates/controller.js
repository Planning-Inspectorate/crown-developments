import { applicationLinks, applicationUpdateToTimelineItem } from '../view-model.js';
import { isValidUuidFormat } from '@pins/crowndev-lib/util/uuid.js';
import { notFoundHandler } from '@pins/crowndev-lib/middleware/errors.js';
import { shouldDisplayApplicationUpdatesLink } from '../../../util/application-util.js';
import { APPLICATION_UPDATE_STATUS_ID } from '@pins/crowndev-database/src/seed/data-static.js';
import { fetchPublishedApplication, APPLICATION_PUBLISH_STATUS } from '#util/applications.js';

/**
 * Render application updates page
 *
 * @param {import('#service').PortalService & { fetchPublishedApplication?: Function }} service
 * @returns {import('express').Handler}
 */
export function buildApplicationUpdatesPage({
	db,
	fetchPublishedApplication: fetchPublishedApplicationFn = fetchPublishedApplication
}) {
	return async (req, res) => {
		const id = req.params.applicationId;
		if (!id) {
			throw new Error('id param required');
		}
		if (!isValidUuidFormat(id)) {
			return notFoundHandler(req, res);
		}

		const [crownDevelopment, applicationUpdates, publishedApp] = await Promise.all([
			db.crownDevelopment.findUnique({
				where: { id },
				select: {
					reference: true,
					representationsPublishDate: true,
					representationsPeriodStartDate: true,
					representationsPeriodEndDate: true
				}
			}),
			db.applicationUpdate.findMany({
				where: {
					applicationId: id,
					statusId: APPLICATION_UPDATE_STATUS_ID.PUBLISHED
				},
				select: {
					details: true,
					firstPublished: true
				},
				orderBy: {
					firstPublished: 'desc'
				}
			}),
			fetchPublishedApplicationFn({ db, id, args: {} })
		]);

		if (!crownDevelopment) {
			return notFoundHandler(req, res);
		}

		const publishedDate = crownDevelopment.representationsPublishDate;

		const haveYourSayPeriod = {
			start: new Date(crownDevelopment.representationsPeriodStartDate),
			end: new Date(crownDevelopment.representationsPeriodEndDate)
		};

		const displayApplicationUpdates = await shouldDisplayApplicationUpdatesLink(db, id);
		const applicationStatus = publishedApp?.applicationStatus ?? APPLICATION_PUBLISH_STATUS.ACTIVE;
		const isWithdrawn =
			applicationStatus === APPLICATION_PUBLISH_STATUS.WITHDRAWN ||
			applicationStatus === APPLICATION_PUBLISH_STATUS.EXPIRED;
		const isExpired = applicationStatus === APPLICATION_PUBLISH_STATUS.EXPIRED;

		return res.render('views/applications/view/application-updates/view.njk', {
			pageTitle: 'Application updates',
			pageCaption: crownDevelopment.reference,
			currentUrl: req.originalUrl,
			links: applicationLinks(id, haveYourSayPeriod, publishedDate, displayApplicationUpdates),
			applicationUpdates: applicationUpdates.map(applicationUpdateToTimelineItem),
			applicationStatus,
			isWithdrawn,
			isExpired
		});
	};
}
