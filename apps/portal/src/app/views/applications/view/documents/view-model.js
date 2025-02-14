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
		size: driveItem.size && bytesToUnit(driveItem.size),
		lastModified: formatDateForDisplay(driveItem.lastModifiedDateTime),
		// TODO: map this to user-friendly name
		type: driveItem.file?.mimeType
	};
}
