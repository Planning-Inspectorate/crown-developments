// file properties to fetch for display
const FILE_PROPERTIES = Object.freeze(['file', 'id', 'lastModifiedDateTime', 'name', 'size']);

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
