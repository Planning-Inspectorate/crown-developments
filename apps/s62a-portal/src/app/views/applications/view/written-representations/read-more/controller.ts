import { isValidUuidFormat } from '@pins/crowndev-lib/util/uuid.ts';
import { notFoundHandler } from '@pins/crowndev-lib/middleware/errors.ts';
import { fetchPublishedS62aApplication } from '@pins/crowndev-lib/util/applications.ts';
import { REPRESENTATION_STATUS_ID } from '@pins/crowndev-database/src/seed/data-static.ts';
import { bytesToUnit } from '@pins/crowndev-lib/util/numbers.ts';
import { mapMimeTypeToDisplayName } from '@pins/crowndev-lib/documents/view-model.js';
import { isValidUniqueReference } from '@pins/crowndev-lib/util/random-reference.js';
import { getStringParam } from '@pins/crowndev-lib/util/params.ts';
import { buildWrittenRepresentationsReadMorePage } from '@pins/crowndev-lib/written-representations/read-more/controller.ts';
import type { Service } from '@pins/crowndev-lib/app/base-service.ts';
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
	representedGroupName: true,
	containsAttachments: true,
	distressingContentInRepresentation: true,
	SubmittedFor: { select: { displayName: true } },
	SubmittedByContact: { select: { firstName: true, lastName: true } },
	RepresentedContacts: { select: { orgName: true, firstName: true, lastName: true } },
	Category: { select: { displayName: true } },
	Attachments: {
		where: { statusId: REPRESENTATION_STATUS_ID.ACCEPTED },
		select: {
			id: true,
			statusId: true,
			fileName: true,
			redactedBlobName: true,
			redactedFileName: true,
			size: true,
			mimeType: true
		}
	}
} satisfies Prisma.S62aRepresentationSelect;

/**
 * Render written representation read more page
 */
export function buildS62AWrittenRepresentationsReadMorePage({ db, logger }: Service): AsyncRequestHandler {
	return async (req, res) => {
		const id = getStringParam(req.params, 'applicationId');
		if (!isValidUuidFormat(id)) {
			return notFoundHandler(req, res);
		}

		const s62aCase = await fetchPublishedS62aApplication({
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

		if (!s62aCase) {
			return notFoundHandler(req, res);
		}
		const { reference } = s62aCase;

		const representationReference = req.params.representationReference;
		if (typeof representationReference !== 'string' || !isValidUniqueReference(representationReference)) {
			return notFoundHandler(req, res);
		}

		const representation = await db.s62aRepresentation.findUnique({
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
				documents = documentsToFetch.map((document) => ({
					id: document.id,
					name: document.redactedBlobName ? (document.redactedFileName ?? document.fileName) : document.fileName,
					size: bytesToUnit(Number(document.size), 0),
					type: mapMimeTypeToDisplayName(document.mimeType)
				}));
			}
		}

		return buildWrittenRepresentationsReadMorePage(
			s62aCase,
			representation,
			representationReference,
			false,
			documents
		)(req, res);
	};
}
