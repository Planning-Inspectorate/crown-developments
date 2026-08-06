import type { ManageService } from '#service';
import type { Prisma } from '@pins/crowndev-database/src/client/client.ts';
import { wrapPrismaError } from '@pins/crowndev-lib/util/database.ts';
import { addSessionData } from '@pins/crowndev-lib/util/session.ts';
import { stringToKebab } from '@pins/crowndev-lib/util/string.ts';
import { generateUniqueFilename } from '@pins/crowndev-lib/util/file.ts';
import type { Request, Response } from 'express';
import type { ParamsDictionary } from 'express-serve-static-core';
import type { Readable } from 'stream';

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

export class DocumentDownloader {
	private readonly service;

	constructor(service: ManageService) {
		this.service = service;
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

		const documents = await this.fetchDocumentsMetadata(documentIds);
		if (!documents || documents.length === 0) return;

		if (documents.length === 1) {
			await this.streamDocumentToResponse(res, documents[0], isPreview);
		} else {
			await this.streamZipToResponse(res, documents);
		}
	}

	/**
	 * Normalises the body into an array
	 */
	private extractDocumentIds(req: Request<ParamsDictionary, unknown, DownloadRequestBody>): string[] {
		const rawIds = req.params.documentId || req.body?.selectedFiles;
		return (Array.isArray(rawIds) ? rawIds : [rawIds]).filter(Boolean) as string[];
	}

	/**
	 * When no documents are selected we reload the page with an error.
	 */
	private handleNoDocumentsSelected(req: Request<ParamsDictionary, unknown, DownloadRequestBody>, res: Response) {
		const returnUrl = req.body?.returnUrl || '/';
		const caseId = req.body?.caseId || '';
		addSessionData(req, caseId, { filesErrors: [{ text: 'Select file(s) to download', href: '#' }] }, 'folder');

		return res.redirect(returnUrl);
	}

	/**
	 * Grabs the data like name, size etc. from the documents needed
	 */
	private async fetchDocumentsMetadata(documentIds: string[]) {
		try {
			const documents = await this.service.db.document.findMany({
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
				logger: this.service.logger,
				message: 'fetching documents',
				logParams: { documentIds }
			});
		}
	}

	/**
	 * Creates a zip response of all selected files, making sure to give unique names
	 * to any file that might have the same name.
	 *
	 * We use a zip level of 5 as that is a good middle ground for speed and compression.
	 * This can be tweaked if needed.
	 */
	private async streamZipToResponse(
		res: Response,
		documents: Prisma.DocumentGetPayload<{
			include: {
				S62aCase: {
					select: {
						reference: true;
					};
				};
			};
		}>[]
	): Promise<string> {
		const { blobStore, logger, createZipArchive } = this.service;
		if (!blobStore) throw new Error('Blob store client missing');

		const kebabReference = stringToKebab(documents[0].S62aCase.reference);
		const zipFileName = `${kebabReference}-bulk-download-${new Date().toISOString().split('T')[0]}.zip`;

		res.setHeader('Content-Type', 'application/zip');
		res.setHeader('Content-Disposition', `attachment; filename="${zipFileName}"`);

		const archive = createZipArchive({ zlib: { level: 5 } });

		archive.on('error', (err: Error) => {
			logger.error({ err }, 'Error zipping files');
			res.destroy(err);
		});

		archive.pipe(res);

		const seenFileNames = new Set<string>();

		for (const doc of documents) {
			try {
				const downloadResponse = await blobStore.downloadBlob(doc.blobName);
				const stream = downloadResponse?.readableStreamBody;

				if (stream) {
					const uniqueName = generateUniqueFilename(doc.fileName, seenFileNames);
					archive.append(stream as Readable, { name: uniqueName });
				} else {
					logger.warn({ documentId: doc.id }, 'No stream found for document to zip');
				}
			} catch (error) {
				logger.error({ error, documentId: doc.id }, 'Failed to fetch blob for zip archiving');
			}
		}

		await archive.finalize();
		return zipFileName;
	}

	/**
	 * Streams the document from blob back to the user.
	 */
	private async streamDocumentToResponse(
		res: Response,
		document: { id: string; blobName: string; fileName: string },
		isPreview: boolean
	) {
		const { blobStore, logger } = this.service;
		const { blobName, id: documentId, fileName } = document;

		try {
			const downloadResponse = await blobStore?.downloadBlob(blobName);
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
				const logFn = isAbort ? logger.debug.bind(logger) : logger.error.bind(logger);

				logFn({ documentId, err }, isAbort ? 'File download cancelled' : 'File download stream error');
				res.destroy(err);
			});

			downloadStream.pipe(res);
		} catch (error) {
			logger.error({ error, blobName }, `Error initiating download for: ${blobName}`);
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
