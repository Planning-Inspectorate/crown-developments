import type { S62APortalService } from '#service';
import type { Prisma } from '@pins/crowndev-database/src/client/client.ts';
import { wrapPrismaError } from '@planning-inspectorate/core/util';
import { BaseDocumentDownloader } from '@pins/crowndev-lib/util/base-document-downloader.ts';
import type { Request } from 'express';
import { getStringParam } from '@pins/crowndev-lib/util/params.ts';

type S62aDocument = Prisma.DocumentGetPayload<{
	include: {
		S62aCase: { select: { reference: true } };
	};
}>;

export class DocumentDownloader extends BaseDocumentDownloader<S62aDocument> {
	constructor(service: S62APortalService) {
		super(service.db, service.blobStore, service.logger, service.createZipArchive);
	}

	/**
	 * Grabs the data like name, size etc. from the documents needed
	 */
	protected async fetchDocumentsMetadata(documentIds: string[], req: Request): Promise<S62aDocument[] | undefined> {
		try {
			const applicationId = getStringParam(req.params, 'applicationId');
			const documents = await this.db.document.findMany({
				where: {
					id: { in: documentIds },
					deletedAt: null,
					publishDate: { lte: new Date() },
					s62aCaseId: applicationId
				},
				include: {
					S62aCase: { select: { reference: true } }
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
	protected getZipFileReference(documents: S62aDocument[]): string {
		return documents[0].S62aCase.reference;
	}
}
