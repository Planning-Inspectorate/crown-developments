import { isValidUuidFormat } from '@pins/crowndev-lib/util/uuid.js';
import { notFoundHandler } from '@pins/crowndev-lib/middleware/errors.js';
import { fetchPublishedApplication } from '#util/applications.js';
import { REPRESENTATION_STATUS_ID } from '@pins/crowndev-database/src/seed/data-static.js';
import { applicationLinks, representationToViewModel } from '../../view-model.js';

/**
 * Render written representation read more page
 *
 * @type {import('express').RequestHandler}
 */
export function buildWrittenRepresentationsReadMorePage({ db }) {
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

		const representationReference = req.params.representationReference;
		if (!representationReference) {
			throw new Error('representationReference param required');
		}

		const representation = await db.representation.findUnique({
			where: {
				reference: representationReference,
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
			}
		});

		if (!representation) {
			return notFoundHandler(req, res);
		}

		const haveYourSayPeriod = {
			start: new Date(crownDevelopment.representationsPeriodStartDate),
			end: new Date(crownDevelopment.representationsPeriodEndDate)
		};
		const representationsPublishDate = crownDevelopment.representationsPublishDate;

		console.log(req.originalUrl);

		res.render('views/applications/view/written-representations/read-more/view.njk', {
			pageCaption: crownDevelopment.reference,
			pageTitle: 'Written representations - read more',
			links: applicationLinks(id, haveYourSayPeriod, representationsPublishDate),
			currentUrl: req.originalUrl,
			representationViewModel: representationToViewModel(representation)
		});
	};
}
