import { representationFolderPath } from './sharepoint-path.js';

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
	const representationSubFolderPath = `${folderPath}/${representationReference}`;
	const representationSubFolderId = representationFolder.id;
	const representationAttachmentsIds = representationAttachments.map((attachment) => attachment.itemId);
	try {
		logger.info(
			{ representationReference, representationAttachmentsIds, representationSubFolderId, representationSubFolderPath },
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
				representationSubFolderPath
			},
			'Error moving representation attachments'
		);
		throw new Error(`Failed to move representation attachments: ${error.message}`);
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
			throw new Error(`Failed to create SharePoint folder: ${representationReference} folder`);
		}
	}
	if (!subFolderResponse || !subFolderResponse.id) {
		throw new Error(`Representation subfolder not found for reference: ${representationReference}`);
	}
	return subFolderResponse;
}
