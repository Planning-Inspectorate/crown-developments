import { loadPublishedApplicationOr404 } from './application-util.ts';
import { forwardStreamContents, getDriveItemDownloadUrl } from '@pins/crowndev-lib/documents/utils.js';
import { getStringParam } from '@pins/crowndev-lib/util/params.ts';
import { notFoundHandler } from '@pins/crowndev-lib/middleware/errors.ts';
import { isValidUniqueReference } from '@pins/crowndev-lib/util/random-reference.js';
import { REPRESENTATION_STATUS_ID } from '@pins/crowndev-database/src/seed/data-static.ts';

/**
 * @typedef {object} DocumentOptions
 * @property {(reference: string, req: import('express').Request) => string} getAllowedFolderPath - function to get the allowed folder path for a given reference and request
 * @property {(options: { applicationId: string, documentId: string, req: import('express').Request }) => Promise<boolean>} [isDocumentAllowed] - optional function to check if a document is allowed for download
 */

/**
 * Render a document
 * @param {import('#service').PortalService} service
 * @param {DocumentOptions} options
 * @param {global.fetch} [fetchImpl] - for testing
 * @returns {import('express').Handler}
 */
export function buildDocumentView(service, options, fetchImpl) {
	const { db, logger, sharePointDrive } = service;

	if (typeof options?.getAllowedFolderPath !== 'function') {
		throw new Error('buildDocumentView requires options.getAllowedFolderPath');
	}
	const { getAllowedFolderPath, isDocumentAllowed } = options;

	return async (req, res) => {
		const documentId = getStringParam(req.params, 'documentId');

		const crownDevelopment = await loadPublishedApplicationOr404(req, res, db);
		if (!crownDevelopment) {
			return; // 404 already handled
		}
		const { id: applicationId, reference } = crownDevelopment;

		if (isDocumentAllowed && !(await isDocumentAllowed({ applicationId, documentId, req }))) {
			logger.warn({ reference, documentId }, 'document is not allowed for download');
			return notFoundHandler(req, res);
		}

		logger.debug({ reference, documentId }, 'download file');

		let driveItem;
		try {
			driveItem = await sharePointDrive.getDriveItem(documentId, [['$select', 'id,parentReference']]);
		} catch (error) {
			logger.error({ error, documentId }, 'error fetching document from sharepoint');
			throw new Error('There is a problem fetching this document', { cause: error });
		}

		if (!isDriveItemInFolder(driveItem, getAllowedFolderPath(reference, req))) {
			logger.warn({ reference, documentId }, 'document is not in the allowed folder');
			return notFoundHandler(req, res);
		}

		const downloadUrl = await getDriveItemDownloadUrl(sharePointDrive, documentId, logger);
		await forwardStreamContents(downloadUrl, req, res, logger, documentId, fetchImpl);
	};
}

/**
 * Check the drive item's parent folder exactly matches the allowed folder.
 * @param {import('@microsoft/microsoft-graph-types').DriveItem | undefined} driveItem
 * @param {string} folderPath
 * @returns {boolean}
 */
export function isDriveItemInFolder(driveItem, folderPath) {
	const parentPath = driveItem?.parentReference?.path;
	if (!parentPath || !folderPath) return false;

	const rootIndex = parentPath.indexOf('root:');
	if (rootIndex === -1) return false;

	let actual;
	try {
		actual = decodeURIComponent(parentPath.slice(rootIndex + 'root:'.length));
	} catch {
		return false;
	}

	const normalise = (path) => path.split('/').filter(Boolean).join('/').toLowerCase();
	// checks that the driveItem is in the allowed folder route
	return normalise(actual) === normalise(folderPath);
}

/**
 *
 * @param {import('@pins/crowndev-database').PrismaClient} db
 * @param opt
 * @param {string} opt.applicationId
 * @param {string} opt.representationReference
 * @param {string} opt.documentId
 * @returns {Promise<boolean>}
 */
export async function isPublishedRepresentationDocument(db, { applicationId, representationReference, documentId }) {
	if (!isValidUniqueReference(representationReference)) return false;

	const count = await db.representationDocument.count({
		where: {
			statusId: REPRESENTATION_STATUS_ID.ACCEPTED,
			Representation: {
				reference: representationReference,
				applicationId,
				statusId: REPRESENTATION_STATUS_ID.ACCEPTED
			},
			OR: [{ redactedItemId: documentId }, { itemId: documentId, redactedItemId: null }]
		}
	});
	return count > 0;
}
