import type { ManageService } from '#service';
import type { Prisma } from '@pins/crowndev-database/src/client/client.ts';
import { wrapPrismaError } from '@planning-inspectorate/core/util';
import { addSessionData } from '@pins/crowndev-lib/util/session.ts';
import { isValidRedirectUri } from '@pins/crowndev-lib/util/uri.ts';
import type { Request, Response } from 'express';
import type { ParamsDictionary } from 'express-serve-static-core';
import { BaseDocumentDownloader, type DownloadRequestBody } from '@pins/crowndev-lib/util/base-document-downloader.ts';
import { FILE_AUDIT_ACTIONS } from '@pins/crowndev-lib/audit/files.ts';
import { recordS62aFileAudit } from '../../../audit/files.ts';

type S62aDocument = Prisma.DocumentGetPayload<{
	include: {
		S62aCase: { select: { reference: true } };
	};
}>;

export class DocumentDownloader extends BaseDocumentDownloader<S62aDocument> {
	private readonly service: ManageService;

	constructor(service: ManageService) {
		super(service.db, service.blobStore, service.logger, service.createZipArchive);
		this.service = service;
	}

	/**
	 * Grabs the data like name, size etc. from the documents needed
	 */
	protected async fetchDocumentsMetadata(documentIds: string[]): Promise<S62aDocument[] | undefined> {
		try {
			const documents = await this.db.document.findMany({
				where: { id: { in: documentIds } },
				include: {
					S62aCase: { select: { reference: true } }
				}
			});

			if (!documents || documents.length === 0) {
				throw new Error(`No documents found for provided ids`);
			}

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
	 * When no documents are selected we reload the page with an error.
	 */
	protected handleNoDocumentsSelected(
		req: Request<ParamsDictionary, unknown, DownloadRequestBody>,
		res: Response
	): void {
		const returnUrl = isValidRedirectUri(req.body?.returnUrl) ? (req.body.returnUrl as string) : '/';
		const caseId = req.body?.caseId || '';

		addSessionData(req, caseId, { filesErrors: [{ text: 'Select file(s) to download', href: '#' }] }, 'folder');

		res.redirect(returnUrl);
	}

	/**
	 * Provides the case reference to prefix the zip file name
	 */
	protected getZipFileReference(documents: S62aDocument[]): string {
		return documents[0].S62aCase.reference;
	}

	/**
	 * Records the download in the case history. Several files are recorded
	 * with the name of the zip they were downloaded in. Previews aren't
	 * downloads, so the base class doesn't call this for them.
	 */
	protected async onDownloaded(
		req: Request<ParamsDictionary, unknown, DownloadRequestBody>,
		documents: S62aDocument[],
		zipFileName?: string
	): Promise<void> {
		const caseId = documents[0]?.s62aCaseId;
		if (!caseId) return;

		await recordS62aFileAudit(
			this.service,
			req,
			caseId,
			documents.map((document) => document.fileName),
			FILE_AUDIT_ACTIONS.downloaded,
			zipFileName ? { zipName: zipFileName } : undefined
		);
	}
}
