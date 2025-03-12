import { isValidUuidFormat } from '@pins/crowndev-lib/util/uuid.js';
import { notFoundHandler } from '@pins/crowndev-lib/middleware/errors.js';
import { fetchPublishedApplication } from '#util/applications.js';
import { REPRESENTATION_STATUS_ID } from '@pins/crowndev-database/src/seed/data-static.js';
import { applicationLinks, representationToViewModel } from '../../view-model.js';
import { caseReferenceToFolderName } from '@pins/crowndev-lib/util/name.js';
import { getDocuments } from '../../../../util/documents-util.js';
import { mapDriveItemToViewModel } from '../../documents/view-model.js';

const PUBLISHED_FOLDER = 'Published';
const REPRESENTATION_ATTACHMENTS = 'RepresentationAttachments';

/**
 * Render written representation read more page
 *
 * @type {import('express').RequestHandler}
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

		let documents;
		if (representation.containsAttachments === true) {
			//Assume documents are in the folder <case-ref>/Published/RepresentationAttachments/<rep-ref>
			const folderPath =
				caseReferenceToFolderName(id) +
				'/' +
				PUBLISHED_FOLDER +
				'/' +
				REPRESENTATION_ATTACHMENTS +
				'/' +
				representationReference;

			logger.info({ folderPath }, 'view documents');
			const items = await getDocuments(sharePointDrive, folderPath, logger, id);
			documents = items.map(mapDriveItemToViewModel);
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
