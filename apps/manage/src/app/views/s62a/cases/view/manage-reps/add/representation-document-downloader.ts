import { wrapPrismaError } from '@pins/crowndev-lib/util/database.ts';
import { BaseDocumentDownloader } from '@pins/crowndev-lib/util/base-document-downloader.ts';
import type { ManageService } from '#service';
import type { DraftBlobRepresentationDocument } from '@pins/crowndev-database/src/client/client.ts';
import type { Request } from 'express';

export class RepresentationDocumentDownloader extends BaseDocumentDownloader<DraftBlobRepresentationDocument> {
	constructor(service: ManageService) {
		super(service.db, service.blobStore, service.logger, service.createZipArchive);
	}

	/**
	 * Grabs the data like name, size etc. from the documents needed
	 */
	protected async fetchDocumentsMetadata(
		documentIds: string[],
		req: Request
	): Promise<DraftBlobRepresentationDocument[] | undefined> {
		const sessionID = req.sessionID;
		try {
			const documents = await this.db.draftBlobRepresentationDocument.findMany({
				where: { id: { in: documentIds }, sessionKey: sessionID }
			});

			if (!documents || documents.length === 0) {
				throw new Error(`No documents found for provided ids`);
			}

			return documents;
		} catch (error) {
			wrapPrismaError({
				error,
				logger: this.logger,
				message: 'fetching representation documents',
				logParams: { documentIds }
			});
			return undefined;
		}
	}

	protected getZipFileReference(documents: DraftBlobRepresentationDocument[]): string {
		return documents[0].sessionKey || 's62a-representation-documents';
	}
}
