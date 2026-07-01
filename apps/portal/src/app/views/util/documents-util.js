import { loadPublishedApplicationOr404 } from './application-util.ts';
import { forwardStreamContents, getDriveItemDownloadUrl } from '@pins/crowndev-lib/documents/utils.js';
import { getStringParam } from '@pins/crowndev-lib/util/params.ts';

/**
 * Render a document
 * @param {import('#service').PortalService} service
 * @param {global.fetch} [fetchImpl] - for testing
 * @returns {import('express').Handler}
 */
export function buildDocumentView(service, fetchImpl) {
	const { db, logger, sharePointDrive } = service;
	return async (req, res) => {
		const documentId = getStringParam(req.params, 'documentId');

		const crownDevelopment = await loadPublishedApplicationOr404(req, res, db);
		if (!crownDevelopment) {
			return; // 404 already handled
		}
		const { reference } = crownDevelopment;

		logger.debug({ reference, documentId }, 'download file');

		const downloadUrl = await getDriveItemDownloadUrl(sharePointDrive, documentId, logger);
		await forwardStreamContents(downloadUrl, req, res, logger, documentId, fetchImpl);
	};
}
