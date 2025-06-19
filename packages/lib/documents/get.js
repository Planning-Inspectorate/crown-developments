import { FILE_PROPERTIES, mapDriveItemToViewModel } from './view-model.js';

/**
 * Wrap the sharepoint call to catch SharePoint errors and throw a user-friendly error
 * Also map to the view model
 *
 * @param {Object} opts
 * @param {import('@pins/crowndev-sharepoint/src/sharepoint/drives/drives.js').SharePointDrive} opts.sharePointDrive
 * @param {string} opts.folderPath
 * @param {import('pino').BaseLogger} opts.logger
 * @param {string} opts.id
 * @param {function(a, b): number} [opts.sortFn]
 * @returns {Promise<import('./types.js').DocumentViewModel[]>}
 */
export async function getDocuments({ sharePointDrive, folderPath, logger, id, sortFn }) {
	try {
		const items = await sharePointDrive.getItemsByPath(folderPath, [['$select', FILE_PROPERTIES.join(',')]]);
		if (sortFn) {
			items.sort(sortFn);
		}
		return items.map(mapDriveItemToViewModel).filter(Boolean);
	} catch (err) {
		// don't show SharePoint errors to the user
		logger.error({ err, id, folderPath }, 'error fetching documents from sharepoint');
		throw new Error('There is a problem fetching documents');
	}
}

/**
 * Wrap the sharepoint call to catch SharePoint errors and throw a user-friendly error
 * Also map to the view model
 *
 * @param {Object} opts
 * @param {import('@pins/crowndev-sharepoint/src/sharepoint/drives/drives.js').SharePointDrive} opts.sharePointDrive
 * @param {string} opts.folderPath
 * @param {import('pino').BaseLogger} opts.logger
 * @param {string[]} opts.ids
 * @param {function(a, b): number} [opts.sortFn]
 * @returns {Promise<import('./types.js').DocumentViewModel[]>}
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
		return items.map(mapDriveItemToViewModel).filter(Boolean);
	} catch (err) {
		logger.error({ err, ids, folderPath }, 'error fetching documents from sharepoint');
		throw new Error('There is a problem fetching documents');
	}
}
