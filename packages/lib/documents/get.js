import { FILE_PROPERTIES } from './view-model.js';

/**
 * Fetch DriveItems from SharePoint.
 * Returns raw DriveItems - use mapDriveItemToViewModel to convert to view models.
 *
 * @param {Object} opts
 * @param {import('@pins/crowndev-sharepoint/src/sharepoint/drives/drives.js').SharePointDrive} opts.sharePointDrive
 * @param {string} opts.folderPath
 * @param {import('pino').BaseLogger} opts.logger
 * @param {string} opts.id
 * @param {function(a, b): number} [opts.sortFn]
 * @param {string[]} [opts.metaDataFields]
 * @returns {Promise<import('@microsoft/microsoft-graph-types').DriveItem[]>}
 */
export async function getDocuments({ sharePointDrive, folderPath, logger, id, sortFn, metaDataFields }) {
	try {
		let items;
		if (metaDataFields && metaDataFields.length > 0) {
			items = await sharePointDrive.getItemsByPathWithCustomMetadata(
				folderPath,
				[['$select', FILE_PROPERTIES.join(',')]],
				metaDataFields
			);
		} else {
			items = await sharePointDrive.getItemsByPath(folderPath, [['$select', FILE_PROPERTIES.join(',')]]);
		}
		if (sortFn) {
			items.sort(sortFn);
		}
		return items;
	} catch (error) {
		// don't show SharePoint errors to the user
		logger.error({ error, id, folderPath }, 'error fetching documents from sharepoint');
		throw new Error('There is a problem fetching documents', { cause: error });
	}
}

/**
 * Fetch DriveItems by IDs from SharePoint.
 * Returns raw DriveItems - use mapDriveItemToViewModel to convert to view models.
 *
 * @param {Object} opts
 * @param {import('@pins/crowndev-sharepoint/src/sharepoint/drives/drives.js').SharePointDrive} opts.sharePointDrive
 * @param {string} opts.folderPath
 * @param {import('pino').BaseLogger} opts.logger
 * @param {string[]} opts.ids
 * @param {function(a, b): number} [opts.sortFn]
 * @returns {Promise<import('@microsoft/microsoft-graph-types').DriveItem[]>}
 */
export async function getDocumentsById({ sharePointDrive, folderPath, logger, ids, sortFn }) {
	try {
		const requests = [];
		for (const id of ids) {
			requests.push(sharePointDrive.getDriveItem(id, [['$select', FILE_PROPERTIES.join(',')]]));
		}
		const items = await Promise.all(requests);
		if (sortFn) {
			items.sort(sortFn);
		}
		return items;
	} catch (error) {
		logger.error({ error, ids, folderPath }, 'error fetching documents from sharepoint');
		throw new Error('There is a problem fetching documents', { cause: error });
	}
}
