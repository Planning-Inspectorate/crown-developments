import { wrapPrismaError } from '@planning-inspectorate/core/util';
import { BaseDocumentDownloader } from '@pins/crowndev-lib/util/base-document-downloader.ts';
import type { ManageService } from '#service';
import type { DraftBlobRepresentationDocument } from '@pins/crowndev-database/src/client/client.ts';
import type { Request } from 'express';

export class DraftRedactedDocumentDownloader extends BaseDocumentDownloader<DraftBlobRepresentationDocument> {
	constructor(service: ManageService) {
		super(service.db, service.blobStore, service.logger, service.createZipArchive);
	}

	/**
	 * Specifically targets the draft documents that are pointing to a parent committed document (targetDocumentId)
	 * (i.e. the redacted children (normally just 1 child) of a committed document).
	 *
	 * We key by targetDocumentId AND sessionKey just to make sure that we don't download an old orphaned file from this
	 * document that didn't get cleaned up properly.
	 */
	protected async fetchDocumentsMetadata(
		documentIds: string[],
		req: Request
	): Promise<DraftBlobRepresentationDocument[] | undefined> {
		try {
			const documents = await this.db.draftBlobRepresentationDocument.findMany({
				where: { targetDocumentId: { in: documentIds }, sessionKey: req.sessionID }
			});

			if (!documents || documents.length === 0) {
				throw new Error(`No documents found for provided ids`);
			}

			return documents;
		} catch (error) {
			wrapPrismaError({
				error,
				logger: this.logger,
				message: 'fetching manage representation documents',
				logParams: { documentIds }
			});
		}
	}

	protected getZipFileReference(documents: DraftBlobRepresentationDocument[]): string {
		return documents[0].targetDocumentId || 's62a-representation-documents';
	}
}
