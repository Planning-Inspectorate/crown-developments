import { wrapPrismaError } from '@planning-inspectorate/core/util';
import { BaseDocumentDownloader } from '@pins/crowndev-lib/util/base-document-downloader.ts';
import type { ManageService } from '#service';
import type { BlobWithdrawalRequestDocument } from '@pins/crowndev-database/src/client/client.ts';

/**
 * Downloads committed documents for a withdrawal request
 */
export class CommittedWithdrawalRequestDocumentDownloader extends BaseDocumentDownloader<BlobWithdrawalRequestDocument> {
	constructor(service: ManageService) {
		super(service.db, service.blobStore, service.logger, service.createZipArchive);
	}

	/**
	 * Grabs the data like name, size etc. from the documents needed
	 */
	protected async fetchDocumentsMetadata(documentIds: string[]): Promise<BlobWithdrawalRequestDocument[] | undefined> {
		try {
			const documents = await this.db.blobWithdrawalRequestDocument.findMany({
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
				message: 'fetching committed withdrawal request documents',
				logParams: { documentIds }
			});
		}
	}

	protected getZipFileReference(documents: BlobWithdrawalRequestDocument[]): string {
		return documents[0].s62aRepresentationId || 's62a-representation-withdrawal-documents';
	}
}
