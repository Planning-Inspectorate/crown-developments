import type { S62AFolder } from '@pins/crowndev-database/src/client/client.ts';
import { stringToKebab } from '@pins/crowndev-lib/util/string.ts';

/**
 * Formats folders array for displaying, ordering them as well.
 */
export function createFoldersViewModel(folders: S62AFolder[]) {
	const sortedFolders = folders.sort((a, b) => (a.displayOrder || 100) - (b?.displayOrder || 100));

	const mappedFolders = sortedFolders.map((folder) => {
		return {
			...folder,
			encodedDisplayName: stringToKebab(folder.displayName)
		};
	});
	return mappedFolders;
}
