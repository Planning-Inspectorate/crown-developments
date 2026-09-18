import { wrapPrismaError } from '@pins/crowndev-lib/util/database.ts';
import { BaseDocumentDownloader } from '@pins/crowndev-lib/util/base-document-downloader.ts';
import type { ManageService } from '#service';
import type { DraftBlobWithdrawalRequestDocument } from '@pins/crowndev-database/src/client/client.ts';

/**
 * Downloads draft documents for a withdrawal request before committing
 */
export class WithdrawalRequestDocumentDownloader extends BaseDocumentDownloader<DraftBlobWithdrawalRequestDocument> {
	constructor(service: ManageService) {
		super(service.db, service.blobStore, service.logger, service.createZipArchive);
	}

	/**
	 * Grabs the data like name, size etc. from the documents needed
	 */
	protected async fetchDocumentsMetadata(
		documentIds: string[]
	): Promise<DraftBlobWithdrawalRequestDocument[] | undefined> {
		try {
			const documents = await this.db.draftBlobWithdrawalRequestDocument.findMany({
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
		}
	}

	protected getZipFileReference(documents: DraftBlobWithdrawalRequestDocument[]): string {
		return documents[0].s62aRepresentationId || 's62a-representation-withdrawal-documents';
	}
}
