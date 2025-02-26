import { bytesToUnit } from '@pins/crowndev-lib/util/numbers.js';
import { formatDateForDisplay } from '@pins/dynamic-forms/src/lib/date-utils.js';

/**
 * @param {import('@microsoft/microsoft-graph-types').DriveItem} driveItem
 * @returns {import('./types.js').DocumentViewModel}
 */
export function mapDriveItemToViewModel(driveItem) {
	return {
		id: driveItem.id,
		name: driveItem.name,
		size: driveItem.size && bytesToUnit(driveItem.size, 0),
		lastModified: formatDateForDisplay(driveItem.lastModifiedDateTime),
		// TODO: map this to user-friendly name
		type: mapMimeTypeToDisplayName(driveItem.file?.mimeType)
	};
}

/**
 * @param {string} mimeType
 * @returns {string}
 */
export function mapMimeTypeToDisplayName(mimeType) {
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
