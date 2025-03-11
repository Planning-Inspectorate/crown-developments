import { isValidUuidFormat } from '@pins/crowndev-lib/util/uuid.js';
import { notFoundHandler } from '@pins/crowndev-lib/middleware/errors.js';
import { fetchPublishedApplication } from '#util/applications.js';
import { applicationLinks, representationToViewModel } from '../view-model.js';
import { REPRESENTATION_STATUS_ID } from '@pins/crowndev-database/src/seed/data-static.js';

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

		const representations = await db.representation.findMany({
			where: {
				// applicationId: id,
				statusId: REPRESENTATION_STATUS_ID.ACCEPTED
			},
			select: {
				reference: true,
				submittedDate: true,
				comment: true,
				commentRedacted: true,
				submittedByAgentOrgName: true,
				submittedForId: true,
				representedTypeId: true,
				containsAttachments: true,
				SubmittedFor: { select: { displayName: true } },
				SubmittedByContact: { select: { fullName: true, isAdult: true } },
				RepresentedContact: { select: { fullName: true, isAdult: true } },
				Category: { select: { displayName: true } }
			},
			orderBy: {
				submittedDate: 'desc'
			},
			take: 100 //TODO: use skip when using pagination if result set larger than 100
		});

		const haveYourSayPeriod = {
			start: new Date(crownDevelopment.representationsPeriodStartDate),
			end: new Date(crownDevelopment.representationsPeriodEndDate)
		};
		const representationsPublishDate = crownDevelopment.representationsPublishDate;

		res.render('views/applications/view/written-representations/view.njk', {
			pageCaption: crownDevelopment.reference,
			pageTitle: 'Written representations',
			representations: representations.map(representationToViewModel),
			numberOfRepresentations: representations.length,
			links: applicationLinks(id, haveYourSayPeriod, representationsPublishDate),
			currentUrl: req.originalUrl
		});
	};
}
