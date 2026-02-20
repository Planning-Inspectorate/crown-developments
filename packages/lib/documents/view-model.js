import { formatDateForDisplay } from '@planning-inspectorate/dynamic-forms/src/lib/date-utils.js';
import { bytesToUnit } from '../util/numbers.js';

// file properties to fetch for display
export const FILE_PROPERTIES = Object.freeze(['file', 'id', 'lastModifiedDateTime', 'name', 'size']);

/**
 * @param {import('@microsoft/microsoft-graph-types').DriveItem} driveItem
 * @returns {import('./types.js').DocumentViewModel|undefined}
 */
export function mapDriveItemToViewModel(driveItem) {
	if (!driveItem.file) {
		return undefined; // not a file, a folder
	}

	return {
		id: driveItem.id,
		name: driveItem.name,
		size: driveItem.size && bytesToUnit(driveItem.size, 0),
		lastModified: formatDateForDisplay(driveItem.lastModifiedDateTime),
		type: mapMimeTypeToDisplayName(driveItem.file?.mimeType),
		distressing: isDistressingContent(driveItem?.listItem?.fields)
	};
}

/**
 * @param {string} mimeType
 * @returns {string}
 */
function mapMimeTypeToDisplayName(mimeType) {
	return mimeTypeMappings[mimeType] || mimeType;
}

/**
 * @type {Readonly<Object<string, string>>}
 */
const mimeTypeMappings = Object.freeze({
	'application/pdf': 'PDF',
	'image/jpeg': 'Image',
	'image/png': 'Image',
	'text/html': 'HTML',
	'video/mp4': 'Video',
	'video/quicktime': 'Video',
	'video/mpeg': 'Audio',
	'video/x-wav': 'Audio',
	'application/msword': 'Word',
	'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'Word',
	'application/x-zip-compressed': 'Zip'
});

const isDistressingContent = (fields) => {
	return Boolean(
		fields?.['Distressing'] &&
		typeof fields['Distressing'] === 'string' &&
		fields['Distressing'].toLowerCase() === 'yes'
	);
};
