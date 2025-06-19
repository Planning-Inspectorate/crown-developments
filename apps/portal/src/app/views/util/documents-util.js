import { checkApplicationPublished } from './application-util.js';
import { forwardStreamContents, getDriveItemDownloadUrl } from '@pins/crowndev-lib/documents/utils.js';

/**
 * Render a document
 * @param {import('#service').PortalService} service
 * @param {global.fetch} [fetchImpl] - for testing
 * @returns {import('express').Handler}
 */
export function buildDocumentView(service, fetchImpl) {
	const { db, logger, sharePointDrive } = service;
	return async (req, res) => {
		const documentId = req.params?.documentId;
		if (!documentId) {
			throw new Error('documentId param is required');
		}

		const crownDevelopment = await checkApplicationPublished(req, res, db);
		if (!crownDevelopment) {
			return; // handled by checkApplicationPublished
		}
		const { reference } = crownDevelopment;

		logger.debug({ reference, documentId }, 'download file');

		const downloadUrl = await getDriveItemDownloadUrl(sharePointDrive, documentId, logger);
		await forwardStreamContents(downloadUrl, req, res, logger, documentId, fetchImpl);
	};
}
