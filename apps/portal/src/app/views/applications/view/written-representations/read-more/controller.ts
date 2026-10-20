import { isValidUuidFormat } from '@pins/crowndev-lib/util/uuid.ts';
import { notFoundHandler } from '@pins/crowndev-lib/middleware/errors.ts';
import { fetchPublishedApplication } from '@pins/crowndev-lib/util/applications.ts';
import { REPRESENTATION_STATUS_ID } from '@pins/crowndev-database/src/seed/data-static.ts';
import { representationAttachmentsFolderPath } from '@pins/crowndev-lib/util/sharepoint-path.js';
import { getDocumentsById } from '@pins/crowndev-lib/documents/get.js';
import { mapDriveItemToViewModel } from '@pins/crowndev-lib/documents/view-model.js';
import { isValidUniqueReference } from '@pins/crowndev-lib/util/random-reference.js';
import { shouldDisplayApplicationUpdatesLink } from '../../../../util/application-util.ts';
import { getStringParam } from '@pins/crowndev-lib/util/params.ts';
import { buildWrittenRepresentationsReadMorePage } from '@pins/crowndev-lib/written-representations/read-more/controller.ts';
import type { PortalService } from '#service';
import type { AsyncRequestHandler } from '@planning-inspectorate/core/util';
import type { DocumentViewModel } from '@pins/crowndev-lib/documents/types.js';
import type { Prisma } from '@pins/crowndev-database/src/client/client.ts';

const representationSelect = {
	id: true,
	reference: true,
	submittedDate: true,
	comment: true,
	commentRedacted: true,
	submittedByAgentOrgName: true,
	submittedForId: true,
	representedTypeId: true,
	containsAttachments: true,
	distressingContentInRepresentation: true,
	SubmittedFor: { select: { displayName: true } },
	SubmittedByContact: { select: { firstName: true, lastName: true } },
	RepresentedContact: { select: { orgName: true, firstName: true, lastName: true } },
	Category: { select: { displayName: true } },
	Attachments: {
		where: { statusId: REPRESENTATION_STATUS_ID.ACCEPTED },
		select: {
			itemId: true,
			fileName: true,
			redactedItemId: true,
			redactedFileName: true,
			statusId: true
		}
	}
} satisfies Prisma.RepresentationSelect;

/**
 * Render written representation read more page
 */
export function buildCrownWrittenRepresentationsReadMorePage({
	db,
	logger,
	sharePointDrive
}: PortalService): AsyncRequestHandler {
	return async (req, res) => {
		const id = getStringParam(req.params, 'applicationId');
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
					representationsPublishDate: true,
					containsDistressingContent: true
				}
			}
		});

		if (!crownDevelopment) {
			return notFoundHandler(req, res);
		}
		const { reference } = crownDevelopment;

		const representationReference = req.params.representationReference;
		if (typeof representationReference !== 'string' || !isValidUniqueReference(representationReference)) {
			return notFoundHandler(req, res);
		}

		const representation = await db.representation.findUnique({
			where: {
				reference: representationReference,
				statusId: REPRESENTATION_STATUS_ID.ACCEPTED
			},
			select: representationSelect
		});

		if (!representation) {
			return notFoundHandler(req, res);
		}

		let documents: DocumentViewModel[] = [];
		if (representation.containsAttachments === true) {
			const documentsToFetch = representation.Attachments;

			if (documentsToFetch.length === 0) {
				logger.warn(
					{ representationReference, caseReference: reference, representationId: representation.id },
					'No documents found for the representation, but representation contains attachments'
				);
				documents = [];
			} else {
				const folderPath = representationAttachmentsFolderPath(reference, representationReference);
				const ids = documentsToFetch.map((doc) => doc.redactedItemId ?? doc.itemId).filter(Boolean);
				const driveItems = await getDocumentsById({ sharePointDrive, folderPath, logger, ids });
				documents = driveItems
					.map(mapDriveItemToViewModel)
					.filter((document): document is DocumentViewModel => document !== undefined);
			}
		}

		const displayApplicationUpdates = await shouldDisplayApplicationUpdatesLink(db, id);

		return buildWrittenRepresentationsReadMorePage(
			crownDevelopment,
			representation,
			representationReference,
			displayApplicationUpdates,
			documents
		)(req, res);
	};
}
