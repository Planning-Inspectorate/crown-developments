import { wrapPrismaError } from '@pins/crowndev-lib/util/database.ts';
import { BaseDocumentDownloader } from '@pins/crowndev-lib/util/base-document-downloader.ts';
import type { ManageService } from '#service';
import type { BlobRepresentationDocument } from '@pins/crowndev-database/src/client/client.ts';

export class ManageRepresentationDocumentDownloader extends BaseDocumentDownloader<BlobRepresentationDocument> {
	constructor(service: ManageService) {
		super(service.db, service.blobStore, service.logger, service.createZipArchive);
	}

	/**
	 * Grabs the data like name, size etc. from the documents needed
	 */
	protected async fetchDocumentsMetadata(documentIds: string[]): Promise<BlobRepresentationDocument[] | undefined> {
		try {
			const documents = await this.db.blobRepresentationDocument.findMany({
				where: { id: { in: documentIds } }
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
			return undefined;
		}
	}

	protected getZipFileReference(documents: BlobRepresentationDocument[]): string {
		return documents[0].s62aRepresentationId || 's62a-representation-documents';
	}
}
