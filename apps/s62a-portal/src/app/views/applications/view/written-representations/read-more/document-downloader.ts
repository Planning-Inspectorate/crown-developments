import type { Request, Response } from 'express';
import type { DownloadRequestBody } from '@pins/crowndev-lib/util/base-document-downloader.ts';
import type { ParamsDictionary } from 'express-serve-static-core';
import type { S62APortalService } from '#service';
import type { Prisma } from '@pins/crowndev-database/src/client/client.ts';
import { BaseDocumentDownloader } from '@pins/crowndev-lib/util/base-document-downloader.ts';
import { wrapPrismaError } from '@planning-inspectorate/core/util';
import { getStringParam } from '@pins/crowndev-lib/util/params.ts';
import { notFoundHandler } from '@planning-inspectorate/core/middleware';
import { isValidUuidFormat } from '@pins/crowndev-lib/util/uuid.ts';
import { isValidUniqueReference } from '@pins/crowndev-lib/util/random-reference.js';
import { REPRESENTATION_STATUS_ID } from '@pins/crowndev-database/src/seed/data-static.ts';

type S62aRepresentationDocument = Prisma.BlobRepresentationDocumentGetPayload<{
	include: {
		S62aRepresentation: {
			include: {
				Application: {
					select: { reference: true };
				};
			};
		};
	};
}>;

export class DocumentDownloader extends BaseDocumentDownloader<S62aRepresentationDocument> {
	constructor(service: S62APortalService) {
		super(service.db, service.blobStore, service.logger, service.createZipArchive);
	}

	/**
	 * Grabs the data like name, size etc. from the documents needed
	 */
	protected async fetchDocumentsMetadata(
		documentIds: string[],
		req: Request
	): Promise<S62aRepresentationDocument[] | undefined> {
		if (!req) return;

		const applicationId = getStringParam(req.params, 'applicationId');
		const representationReference = getStringParam(req.params, 'representationReference');
		if (!isValidUuidFormat(applicationId) || !isValidUniqueReference(representationReference)) return;

		try {
			const documents = await this.db.blobRepresentationDocument.findMany({
				where: {
					id: { in: documentIds },
					statusId: REPRESENTATION_STATUS_ID.ACCEPTED,
					S62aRepresentation: {
						is: {
							reference: representationReference,
							applicationId,
							statusId: REPRESENTATION_STATUS_ID.ACCEPTED,
							Application: {
								is: {
									representationsPublishDate: { lte: new Date() }
								}
							}
						}
					}
				},
				include: {
					S62aRepresentation: {
						include: {
							Application: {
								select: { reference: true }
							}
						}
					}
				}
			});
			if (!documents || documents.length === 0) return;

			return documents;
		} catch (error) {
			wrapPrismaError({
				error,
				logger: this.logger,
				message: 'fetching documents',
				logParams: { documentIds }
			});
		}
	}

	/**
	 * Provides the case reference to prefix the zip file name
	 */
	protected getZipFileReference(documents: S62aRepresentationDocument[]): string {
		return documents[0].S62aRepresentation.Application.reference;
	}
}

/**
 * Builds controller to download documents
 */
export function buildDownloadDocument(service: S62APortalService, downloader: DocumentDownloader) {
	return async (req: Request, res: Response) => {
		try {
			const documentId = getStringParam(req.params, 'documentId');

			if (!isValidUuidFormat(documentId)) {
				return notFoundHandler(req, res);
			}

			await downloader.processDownload(req as Request<ParamsDictionary, unknown, DownloadRequestBody>, res);
		} catch (error) {
			service.logger.error({ error }, 'Unhandled error in document download');
			if (!res.headersSent) {
				res.status(500).send('Internal Server Error');
			}
		}
	};
}
