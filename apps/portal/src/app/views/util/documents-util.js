import { Readable } from 'stream';
import { checkApplicationPublished } from './application-util.js';

// file properties to fetch for display
const FILE_PROPERTIES = Object.freeze(['file', 'id', 'lastModifiedDateTime', 'name', 'size']);

/**
 * Render a document
 * @param {Object} opts
 * @param {import('@prisma/client').PrismaClient} opts.db
 * @param {import('pino').BaseLogger} opts.logger
 * @param {import('@pins/crowndev-sharepoint/src/sharepoint/drives/drives.js').SharePointDrive} opts.sharePointDrive
 * @param {global.fetch} [opts.fetchImpl] - for testing
 * @returns {import('express').Handler}
 */
export function buildDocumentView({ db, logger, sharePointDrive, fetchImpl }) {
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

/**
 * Wrap the sharepoint call to catch SharePoint errors and throw a user-friendly error
 *
 * @param {import('@pins/crowndev-sharepoint/src/sharepoint/drives/drives.js').SharePointDrive} sharePointDrive
 * @param {string} documentId
 * @param {import('pino').BaseLogger} logger
 * @returns {Promise<DriveItemByPathResponse>}
 */
async function getDriveItemDownloadUrl(sharePointDrive, documentId, logger) {
	try {
		return await sharePointDrive.getDriveItemDownloadUrl(documentId);
	} catch (err) {
		// don't show SharePoint errors to the user
		logger.error({ err, documentId }, 'error fetching document URL from sharepoint');
		throw new Error('There is a problem fetching this document');
	}
}

/**
 * Wrap the sharepoint call to catch SharePoint errors and throw a user-friendly error
 *
 * @param {import('@pins/crowndev-sharepoint/src/sharepoint/drives/drives.js').SharePointDrive} sharePointDrive
 * @param {string} path
 * @param {import('pino').BaseLogger} logger
 * @param {string} id
 * @returns {Promise<DriveItemByPathResponse>}
 */
export async function getDocuments(sharePointDrive, path, logger, id) {
	try {
		return await sharePointDrive.getItemsByPath(path, [['$select', FILE_PROPERTIES.join(',')]]);
	} catch (err) {
		// don't show SharePoint errors to the user
		logger.error({ err, id }, 'error fetching documents from sharepoint');
		throw new Error('There is a problem fetching documents');
	}
}

/**
 * @param {string} downloadUrl
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('pino').BaseLogger} logger
 * @param {string} documentId
 * @param {global.fetch} [fetchImpl] - for testing
 * @returns {Promise<void>}
 */
export async function forwardStreamContents(downloadUrl, req, res, logger, documentId, fetchImpl = fetch) {
	// set up an abort controller to cancel requests
	const controller = new AbortController();

	const downloadRes = await fetchImpl(downloadUrl, {
		signal: controller.signal
	});

	// abort downloads if the incoming request is closed
	req.on('close', () => {
		logger.debug({ documentId }, 'request closed, aborting download');
		controller.abort();
	});

	res.header('Content-Type', downloadRes.headers.get('Content-Type'));
	res.header('Content-Length', downloadRes.headers.get('Content-Length'));
	// allow PDFs to be viewed in-browser
	// Content-disposition will set it as an attachment and force download
	if (!downloadRes.headers.get('Content-Type')?.includes('/pdf')) {
		res.header('Content-disposition', downloadRes.headers.get('Content-disposition'));
	}

	const downloadStream = Readable.fromWeb(downloadRes.body);
	// make sure to catch abort errors
	downloadStream.on('error', (err) => {
		if (err?.name === 'AbortError') {
			logger.debug({ documentId }, 'file download cancelled');
		} else {
			logger.error({ err, documentId }, 'file download stream error');
		}
	});
	// forward the contents of the file to the response
	downloadStream.pipe(res);
}
