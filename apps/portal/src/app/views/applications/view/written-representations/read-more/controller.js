import { isValidUuidFormat } from '@pins/crowndev-lib/util/uuid.js';
import { notFoundHandler } from '@pins/crowndev-lib/middleware/errors.js';
import { fetchPublishedApplication } from '#util/applications.js';
import { REPRESENTATION_STATUS_ID } from '@pins/crowndev-database/src/seed/data-static.js';
import { applicationLinks, representationToViewModel } from '../../view-model.js';
import { publishedRepresentationsAttachmentsFolderPath } from '@pins/crowndev-lib/util/sharepoint-path.js';
import { getDocuments } from '@pins/crowndev-lib/documents/get.js';

/**
 * Render written representation read more page
 *
 * @param {import('#service').PortalService} service
 * @returns {import('express').RequestHandler}
 */
export function buildWrittenRepresentationsReadMorePage({ db, logger, sharePointDrive }) {
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
			args: {
				select: {
					reference: true,
					representationsPeriodStartDate: true,
					representationsPeriodEndDate: true,
					representationsPublishDate: true
				}
			}
		});

		if (!crownDevelopment) {
			return notFoundHandler(req, res);
		}
		const { reference } = crownDevelopment;

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
				SubmittedByContact: { select: { firstName: true, lastName: true } },
				RepresentedContact: { select: { orgName: true, firstName: true, lastName: true } },
				Category: { select: { displayName: true } }
			}
		});

		if (!representation) {
			return notFoundHandler(req, res);
		}

		let documents;
		if (representation.containsAttachments === true) {
			const folderPath = publishedRepresentationsAttachmentsFolderPath(reference, representationReference);
			logger.info({ folderPath }, 'view documents');
			documents = await getDocuments({ sharePointDrive, folderPath, logger, id });
		}

		const haveYourSayPeriod = {
			start: new Date(crownDevelopment.representationsPeriodStartDate),
			end: new Date(crownDevelopment.representationsPeriodEndDate)
		};
		const representationsPublishDate = crownDevelopment.representationsPublishDate;
		const writtenRepresentationsUrl = req.originalUrl?.replace(`/${representationReference}`, '');

		res.render('views/applications/view/written-representations/read-more/view.njk', {
			pageCaption: crownDevelopment.reference,
			links: applicationLinks(id, haveYourSayPeriod, representationsPublishDate),
			currentUrl: writtenRepresentationsUrl,
			backLinkText: 'Back to list',
			backLinkUrl: writtenRepresentationsUrl,
			representationViewModel: representationToViewModel(representation),
			documents
		});
	};
}
