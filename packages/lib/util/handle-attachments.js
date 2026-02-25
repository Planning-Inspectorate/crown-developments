import { APPLICATION_FOLDERS, representationFolderPath, representationSessionFolderPath } from './sharepoint-path.js';

/**
 * @typedef {Object} RepresentationAttachment
 * @property {string} itemId - The ID of the attachment
 * @property {string} fileName - The name of the attachment
 * @property {string} mimeType - The MIME type of the attachment
 * @property {number} size - The size of the attachment in bytes
 */
/**
 * Move representation attachments to the case's representation folder in SharePoint
 * @param {Object} opts
 * @param {import('#service').PortalService | import('#service').ManageService} opts.service
 * @param {string} opts.applicationReference
 * @param {string} opts.representationReference
 * @param { RepresentationAttachment[] } opts.representationAttachments
 * @param {function} [representationAttachmentsFolderPathFn] - optional function to get the folder path for representation attachments used for testing
 * @param {function} [getRepresentationFolderFn] - optional function to get the representation folder used for testing
 * @returns {Promise<void>}
 */
export async function moveAttachmentsToCaseFolder(
	{ service, applicationReference, representationReference, representationAttachments },
	representationAttachmentsFolderPathFn = representationFolderPath,
	getRepresentationFolderFn = getRepresentationFolder
) {
	const { logger, sharePointDrive } = service;
	const folderPath = representationAttachmentsFolderPathFn(applicationReference);
	const representationFolder = await getRepresentationFolderFn(sharePointDrive, folderPath, representationReference);
	const representationSubFolderId = representationFolder.id;
	const representationSubFolderName = representationFolder.name;
	const representationAttachmentsIds = representationAttachments.map((attachment) => attachment.itemId);
	try {
		logger.info(
			{ representationReference, representationAttachmentsIds, representationSubFolderId, representationSubFolderName },
			'Moving representation attachments'
		);
		await sharePointDrive.moveItemsToFolder(representationAttachmentsIds, representationSubFolderId);
	} catch (error) {
		logger.error(
			{
				error,
				representationReference,
				representationAttachmentsIds,
				representationSubFolderId,
				representationSubFolderName
			},
			'Error moving representation attachments'
		);
		throw new Error(`Failed to move representation attachments: ${error.message}`, { cause: error });
	}
	logger.info({ representationReference }, 'moved representation attachments');
}

export async function getRepresentationFolder(sharePointDrive, folderPath, representationReference) {
	const folder = await sharePointDrive.getDriveItemByPath(folderPath);
	if (!folder || !folder.id) {
		throw new Error(`Representation folder not found for reference: ${representationReference}`);
	}
	let subFolderResponse;
	const subFolderPath = `${folderPath}/${representationReference}`;
	try {
		subFolderResponse = await sharePointDrive.addNewFolder(folderPath, representationReference);
	} catch (error) {
		if (error.statusCode === 409) {
			subFolderResponse = await sharePointDrive.getDriveItemByPath(subFolderPath);
		} else {
			throw new Error(`Failed to create SharePoint folder: ${representationReference} folder`, { cause: error });
		}
	}
	if (!subFolderResponse || !subFolderResponse.id) {
		throw new Error(`Representation subfolder not found for reference: ${representationReference}`);
	}
	return subFolderResponse;
}

export async function deleteRepresentationAttachmentsFolder(
	{ service, applicationReference, representationReference, appName },
	req,
	res,
	representationSessionFolderPathFn = representationSessionFolderPath
) {
	const { logger, sharePointDrive } = service;
	const applicationNameFolder = getApplicationNameFolder(appName);

	const sessionId = req.sessionID;

	const folderPath = representationSessionFolderPathFn(applicationReference, applicationNameFolder, sessionId);
	let representationFolder;
	try {
		representationFolder = await sharePointDrive.getDriveItemByPath(folderPath);
	} catch (error) {
		if (error.statusCode === 404) {
			logger.warn(
				{ applicationReference, representationReference, folderPath },
				`Representation session folder not found for ${representationReference}`
			);
			return null; // Folder does not exist
		} else {
			logger.error(
				{ error, applicationReference, representationReference, folderPath },
				`Error retrieving representation session folder for ${representationReference}`
			);
			throw new Error(`Failed to retrieve representation session folder: ${error.message}`, { cause: error });
		}
	}
	if (!representationFolder || !representationFolder.id) {
		logger.warn(
			{ applicationReference, representationReference },
			`Representation session folder not found for ${representationReference}`
		);
		return; // No folder to delete
	}
	logger.info(
		{ applicationReference, representationReference, folderPath },
		`Deleting representation session attachments folder for ${representationReference}`
	);
	try {
		await sharePointDrive.deleteItemsRecursivelyById(representationFolder.id);
	} catch (error) {
		logger.error(
			{ error, applicationReference, representationReference },
			`Error deleting representation attachments for ${representationReference}`
		);
		throw new Error(`Failed to delete representation attachments: ${error.message}`, { cause: error });
	}
	logger.info(
		{ applicationReference, representationReference },
		`Deleted representation attachments folder for ${representationReference}`
	);
}

export function getApplicationNameFolder(appName) {
	return appName === 'portal' ? APPLICATION_FOLDERS.PORTAL : APPLICATION_FOLDERS.MANAGE;
}
