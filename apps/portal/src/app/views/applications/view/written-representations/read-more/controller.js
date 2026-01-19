import { isValidUuidFormat } from '@pins/crowndev-lib/util/uuid.js';
import { notFoundHandler } from '@pins/crowndev-lib/middleware/errors.js';
import { fetchPublishedApplication } from '#util/applications.js';
import { REPRESENTATION_STATUS_ID } from '@pins/crowndev-database/src/seed/data-static.js';
import { applicationLinks, representationToViewModel } from '../../view-model.js';
import {
	publishedRepresentationsAttachmentsFolderPath,
	representationAttachmentsFolderPath
} from '@pins/crowndev-lib/util/sharepoint-path.js';
import { getDocuments, getDocumentsById } from '@pins/crowndev-lib/documents/get.js';
import { wrapPrismaError } from '@pins/crowndev-lib/util/database.js';
import { isValidUniqueReference } from '@pins/crowndev-lib/util/random-reference.js';
import { shouldDisplayApplicationUpdatesLink } from '../../../../util/application-util.js';

/**
 * Render written representation read more page
 *
 * @param {import('#service').PortalService} service
 * @returns {import('express').RequestHandler}
 */
export function buildWrittenRepresentationsReadMorePage({ db, logger, sharePointDrive, isRepsUploadDocsLive }) {
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
		if (!representationReference || !isValidUniqueReference(representationReference)) {
			return notFoundHandler(req, res);
		}

		const representation = await db.representation.findUnique({
			where: {
				reference: representationReference,
				statusId: REPRESENTATION_STATUS_ID.ACCEPTED
			},
			select: {
				id: true,
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
				Category: { select: { displayName: true } },
				Attachments: { select: { statusId: true } }
			}
		});

		if (!representation) {
			return notFoundHandler(req, res);
		}

		let documents;
		if (representation.containsAttachments === true) {
			if (!isRepsUploadDocsLive) {
				const folderPath = publishedRepresentationsAttachmentsFolderPath(reference, representationReference);
				logger.info({ folderPath }, 'view documents');
				documents = await getDocuments({ sharePointDrive, folderPath, logger, id });
			} else {
				let documentsToFetch;
				try {
					documentsToFetch = await db.representationDocument.findMany({
						where: {
							representationId: representation.id,
							statusId: REPRESENTATION_STATUS_ID.ACCEPTED
						},
						select: {
							itemId: true,
							fileName: true,
							redactedItemId: true,
							redactedFileName: true
						}
					});
				} catch (error) {
					logger.error({ error }, 'Error fetching documents from database');
					wrapPrismaError({
						error,
						logger,
						message: 'fetching representation documents',
						logParams: { id }
					});
				}

				if (!Array.isArray(documentsToFetch) || documentsToFetch.length === 0) {
					logger.warn('No documents found for the representation, but representation contains attachments');
					documents = [];
				} else {
					logger.info({ documentsToFetch }, 'Fetched accepted documents for representation');
					const folderPath = representationAttachmentsFolderPath(reference, representationReference);
					const ids = documentsToFetch.map((doc) => doc.redactedItemId ?? doc.itemId).filter(Boolean);
					documents = await getDocumentsById({
						sharePointDrive,
						folderPath,
						logger,
						ids
					});
					logger.info({ documents }, 'Fetched documents to display from SharePoint');
				}
			}
		}

		const haveYourSayPeriod = {
			start: new Date(crownDevelopment.representationsPeriodStartDate),
			end: new Date(crownDevelopment.representationsPeriodEndDate)
		};
		const representationsPublishDate = crownDevelopment.representationsPublishDate;
		const displayApplicationUpdates = await shouldDisplayApplicationUpdatesLink(db, id);
		const applicationStatus = crownDevelopment.applicationStatus;
		const writtenRepresentationsUrl = req.originalUrl?.replace(`/${representationReference}`, '');

		res.render('views/applications/view/written-representations/read-more/view.njk', {
			pageCaption: crownDevelopment.reference,
			links: applicationLinks(
				id,
				haveYourSayPeriod,
				representationsPublishDate,
				displayApplicationUpdates,
				applicationStatus
			),
			currentUrl: writtenRepresentationsUrl,
			backLinkText: 'Back to list',
			backLinkUrl: writtenRepresentationsUrl,
			representationViewModel: representationToViewModel(representation),
			documents
		});
	};
}
