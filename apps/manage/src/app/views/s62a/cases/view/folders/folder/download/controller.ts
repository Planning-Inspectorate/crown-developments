import type { ManageService } from '#service';
import type { Request, Response } from 'express';
import type { ParamsDictionary } from 'express-serve-static-core';
import type { DocumentDownloader } from './document-downloader.ts';

interface DownloadRequestBody {
	selectedFiles?: string | string[];
	returnUrl?: string;
	caseId?: string;
}

export function buildDownloadDocument(service: ManageService, downloader: DocumentDownloader) {
	return async (req: Request<ParamsDictionary, unknown, DownloadRequestBody>, res: Response) => {
		try {
			await downloader.processDownload(req, res);
		} catch (error) {
			service.logger.error({ error }, 'Unhandled error in document download');
			if (!res.headersSent) {
				res.status(500).send('Internal Server Error');
			}
		}
	};
}
