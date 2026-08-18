import type { PrismaClient } from '@pins/crowndev-database/src/client/client.ts';
import type { BlobStorageClient } from '@pins/crowndev-lib/blob-store/blob-store-client.ts';
import { stringToKebab } from '@pins/crowndev-lib/util/string.ts';
import { generateUniqueFilename } from '@pins/crowndev-lib/util/file.ts';
import type { Logger } from 'pino';
import type { Request, Response } from 'express';
import type { ParamsDictionary } from 'express-serve-static-core';
import type { Readable } from 'stream';
import type { Archiver, ArchiverOptions } from 'archiver';
import { isValidRedirectUri } from './uri.ts';

export interface DownloadRequestBody {
	selectedFiles?: string | string[];
	returnUrl?: string;
	caseId?: string;
}

interface HeaderOptions {
	fileName: string;
	contentType?: string;
	contentLength?: number;
	isPreview: boolean;
}

export interface BaseDocumentInfo {
	id: string;
	blobName: string;
	fileName: string;
}

export type CreateZipArchiveFn = (options?: ArchiverOptions) => Archiver;

export abstract class BaseDocumentDownloader<TDocument extends BaseDocumentInfo> {
	protected readonly db: PrismaClient;
	protected readonly blobStore: BlobStorageClient | null;
	protected readonly logger: Logger;
	protected readonly createZipArchive: CreateZipArchiveFn;

	constructor(
		db: PrismaClient,
		blobStore: BlobStorageClient | null,
		logger: Logger,
		createZipArchive: CreateZipArchiveFn
	) {
		this.db = db;
		this.blobStore = blobStore;
		this.logger = logger;
		this.createZipArchive = createZipArchive;
	}

	/**
	 * Public gateway that starts the download process.
	 */
	public async processDownload(req: Request<ParamsDictionary, unknown, DownloadRequestBody>, res: Response) {
		const documentIds = this.extractDocumentIds(req);
		const isPreview = req.query.preview === 'true';

		if (!documentIds.length) {
			return this.handleNoDocumentsSelected(req, res);
		}

		const documents = await this.fetchDocumentsMetadata(documentIds, req);
		if (!documents || documents.length === 0) return;

		if (documents.length === 1) {
			await this.streamDocumentToResponse(res, documents[0], isPreview);
		} else {
			await this.streamZipToResponse(res, documents);
		}
	}

	/**
	 * Grabs the data like name, size etc. from the documents needed
	 */
	protected abstract fetchDocumentsMetadata(documentIds: string[], req?: Request): Promise<TDocument[] | undefined>;

	/**
	 * Default: just redirect back to the return URL if no documents are selected.
	 * Child classes can override this to add session errors if needed.
	 */
	protected handleNoDocumentsSelected(
		req: Request<ParamsDictionary, unknown, DownloadRequestBody>,
		res: Response
	): void {
		const returnUrl = isValidRedirectUri(req.body?.returnUrl) ? (req.body.returnUrl as string) : '/';
		res.redirect(returnUrl);
	}

	/**
	 * Returns the reference string used to name the zip archive.
	 */
	protected abstract getZipFileReference(documents: TDocument[]): string;

	/**
	 * Normalises the body into an array
	 */
	private extractDocumentIds(req: Request<ParamsDictionary, unknown, DownloadRequestBody>): string[] {
		const rawIds = req.params.documentId || req.body?.selectedFiles;
		return (Array.isArray(rawIds) ? rawIds : [rawIds]).filter(Boolean) as string[];
	}

	/**
	 * Creates a zip response of all selected files, making sure to give unique names
	 * to any file that might have the same name.
	 *
	 * We use a zip level of 5 as that is a good middle ground for speed and compression.
	 * This can be tweaked if needed.
	 */
	private async streamZipToResponse(res: Response, documents: TDocument[]): Promise<string> {
		if (!this.blobStore) throw new Error('Blob store client missing');

		const referenceStr = this.getZipFileReference(documents);
		const kebabReference = stringToKebab(referenceStr);
		const zipFileName = `${kebabReference}-bulk-download-${new Date().toISOString().split('T')[0]}.zip`;

		res.setHeader('Content-Type', 'application/zip');
		res.setHeader('Content-Disposition', `attachment; filename="${zipFileName}"`);

		const archive = this.createZipArchive({ zlib: { level: 5 } });

		archive.on('error', (err: Error) => {
			this.logger.error({ err }, 'Error zipping files');
			res.destroy(err);
		});

		archive.pipe(res);

		const seenFileNames = new Set<string>();

		for (const doc of documents) {
			try {
				const downloadResponse = await this.blobStore.downloadBlob(doc.blobName);
				const stream = downloadResponse?.readableStreamBody;

				if (stream) {
					const uniqueName = generateUniqueFilename(doc.fileName, seenFileNames);
					archive.append(stream as Readable, { name: uniqueName });
				} else {
					this.logger.warn({ documentId: doc.id }, 'No stream found for document to zip');
				}
			} catch (error) {
				this.logger.error({ error, documentId: doc.id }, 'Failed to fetch blob for zip archiving');
			}
		}

		await archive.finalize();
		return zipFileName;
	}

	/**
	 * Streams the document from blob back to the user.
	 */
	private async streamDocumentToResponse(res: Response, document: TDocument, isPreview: boolean) {
		if (!this.blobStore) throw new Error('Blob store client missing');

		const { blobName, id: documentId, fileName } = document;

		try {
			const downloadResponse = await this.blobStore.downloadBlob(blobName);
			const downloadStream = downloadResponse?.readableStreamBody;

			if (!downloadStream) {
				throw new Error('No stream received from blob store');
			}

			this.setDownloadHeaders(res, {
				fileName,
				contentType: downloadResponse.contentType,
				contentLength: downloadResponse.contentLength,
				isPreview
			});

			downloadStream.on('error', (err: Error) => {
				const isAbort = err?.name === 'AbortError';
				const logFn = isAbort ? this.logger.debug.bind(this.logger) : this.logger.error.bind(this.logger);

				logFn({ documentId, err }, isAbort ? 'File download cancelled' : 'File download stream error');
				res.destroy(err);
			});

			downloadStream.pipe(res);
		} catch (error) {
			this.logger.error({ error, blobName }, `Error initiating download for: ${blobName}`);
			throw new Error('Failed to download file from blob store', { cause: error });
		}
	}

	/**
	 * Sets the correct headers, which are different for a "preview" in browser
	 * vs hard downloading.
	 */
	private setDownloadHeaders(res: Response, options: HeaderOptions) {
		const { fileName, contentType, contentLength, isPreview } = options;
		const encodedFilename = encodeURIComponent(fileName);

		res.setHeader('Content-Type', contentType || 'application/octet-stream');
		if (contentLength) res.setHeader('Content-Length', contentLength);

		const disposition = isPreview ? 'inline' : 'attachment';
		res.setHeader('Content-Disposition', `${disposition}; filename="${fileName}"; filename*=UTF-8''${encodedFilename}`);
	}
}
